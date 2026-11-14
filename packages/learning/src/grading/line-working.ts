/**
 * line-working@1: calculus working for questions no task-specific checker reads (areas, volumes, improper integrals,
 * partial derivatives, approximations, …), judged LINE BY LINE ON ITS OWN TRUTH.
 *
 * Every "=" in a line is checked by itself, exactly:
 *  - ∫ₐᵇ f dx = [F]ₐᵇ and ∫ f dx = F + C hold when F′ = f (the exact kernel, e6-cas);
 *  - [F]ₐᵇ is F(b) − F(a) (a limit at ∞), d/dx(…) and ∂/∂x(…) are differentiated, lim (x → a) … is the exact limit
 *    (e6-series), f(a) and f′(a) use the function the question defines;
 *  - what is left must be an exact identity (every other letter is an independent constant).
 * A line is wrong only when it visibly fails at sample points (a definite integral is compared with a converged numerical
 * value). Because a line can be true while the working sets up the wrong region or the wrong integral, the working is called
 * complete ("verified") only when every line is true AND it ends at the question's own answer; otherwise it is at most
 * "partial". What cannot be read is unchecked, never right.
 */
import { createHash } from "node:crypto";
import { question } from "../content.ts";
import { N, S, add, mul, neg, normalize, parseExpression, splitEquals, type A } from "../e6-parse.ts";
import { compareExpr, d6, evalNum } from "../e6-cas.ts";
import { limitOf } from "../e6-series.ts";
import { constQ } from "../e6-calc.ts";
import type { Q } from "../exact-e5.ts";
import { toCheckerNotation } from "./calculus-working.ts";
import type { WorkingAssessment } from "./working.ts";

export const LINE_WORKING = "line-working@1" as const;
const digest = (x: unknown) => createHash("sha256").update(JSON.stringify(x, (_k, v) => (typeof v === "bigint" ? v.toString() : v))).digest("hex");

class Unchecked extends Error {}
const json = (a: unknown) => JSON.stringify(a, (_k, v) => (typeof v === "bigint" ? `${v}n` : v));
const unjson = (s: string, f: (v: Record<string, unknown>) => unknown = (v) => v) => JSON.parse(s, (_k, v) => (typeof v === "string" && /^-?\d+n$/.test(v) ? BigInt(v.slice(0, -1)) : v && typeof v === "object" ? f(v) : v));
const subst = (a: A, map: Record<string, A>): A => unjson(json(a), (v) => (v.t === "s" && typeof v.name === "string" && v.name in map ? map[v.name as string] : v)) as A;

interface Def { params: string[]; body: A }
export interface LineTask { v: string; defs: Map<string, Def>; answer: A | null; point: Record<string, A> }
const PD = ["PDx", "PDy", "PDz", "PDt"];

const notation = (t: string) => toCheckerNotation(t)
  .replace(/[×·]/g, "*").replace(/′/g, "'").replace(/″/g, "''")
  // ∂f/∂x and ∂/∂x(…) as their own operator, so a d/dt beside them is never read as partial
  .replace(/∂\s*([a-z])\s*\/\s*∂\s*([a-z])/g, "PD$2($1)").replace(/∂\s*\/\s*∂\s*([a-z])\s*/g, "PD$1")
  .replace(/(?<![a-z])log\b/g, "ln")
  .trim();
/** "A = …", "Area = …", "V = …": a name for what follows, not a claim */
const LABEL = /^\s*(?:the\s+)?(?:required\s+)?(?:area|volume|answer|a|v|i)\s*=\s*/i;

const readIn = (t: string, v: string, fns: Set<string>) => parseExpression(normalize(notation(t)), { fnNames: fns, variable: v });

/** what the question defines (f(x) = …, f(x, y) = …, w = … in terms of other letters) and its answer */
export function lineTaskOf(qid: string): LineTask | null {
  let q: { prompt: string; answer: unknown; type?: string };
  try { q = question(qid.replace(/:mc$/, "")) as typeof q; } catch { return null; }
  const p = q.prompt.replace(/\s+/g, " ").replace(/[−–]/g, "-");
  const v = /\bd[a-z]\/dt\b|\bt seconds\b|\bs = .*\bt\b/.test(p) && !/\bdx\b/.test(p) ? "t" : "x";
  const defs = new Map<string, Def>();
  if (!/ for [a-z] [<>≤≥]| for \(/.test(p)) { // never a piecewise function
    for (const m of p.matchAll(/\b([a-zA-Z])\(([a-z](?:, ?[a-z])*)\) = (.+?)(?= for | is |, (?:find|and|where|use)|; |\. |\.$| at | on |\?)/g)) {
      try { defs.set(m[1], { params: m[2].split(/, ?/), body: readIn(m[3], v, new Set()) }); } catch { /* not read */ }
    }
    for (const m of p.matchAll(/\b([wzu]) = ([^,.;]+?)(?=,| where| and |\.|;)/g)) {
      try { defs.set(m[1], { params: [], body: readIn(m[2], v, new Set()) }); } catch { /* not read */ }
    }
  }
  // the point the question asks about: "at (1, −1)" for f(x, y), "when t = 2", "at x = 16"
  const point: Record<string, A> = {};
  const two = [...defs.values()].find((d) => d.params.length === 2);
  const at2 = p.match(/at \((-?[\d/.]+), (-?[\d/.]+)\)/);
  try {
    if (two && at2) { point[two.params[0]] = readIn(at2[1], v, new Set()); point[two.params[1]] = readIn(at2[2], v, new Set()); }
    for (const m of p.matchAll(/(?:when|at) ([a-z]) = (-?[\d/.]+)/g)) point[m[1]] = readIn(m[2], v, new Set());
  } catch { /* none */ }
  let answer: A | null = null;
  if (q.type !== "choice") try { answer = readIn(String(q.answer), v, new Set()); } catch { answer = null; }
  return { v, defs, answer, point };
}

const symbolsOf = (a: A, out = new Set<string>()): Set<string> => { unjson(json(a), (x) => { if (x.t === "s") out.add(x.name as string); return x; }); return out; };
const hasNode = (a: A, kind: string) => json(a).includes(`"t":"${kind}"`);

/** a with every operator that has an exact value replaced by it */
function reduce(a: A, t: LineTask): A {
  const r = (x: A) => reduce(x, t);
  switch (a.t) {
    case "n": case "pi": case "e": return a;
    case "C": return S("C0");
    case "s": { const d = t.defs.get(a.name); return d ? d.body : a; } // f in ∂f/∂x is f(x, y)
    case "neg": return neg(r(a.a));
    case "add": return { t: "add", xs: a.xs.map(r) };
    case "mul": return { t: "mul", xs: a.xs.map(r) };
    case "div": return { t: "div", a: r(a.a), b: r(a.b) };
    case "pow": return { t: "pow", a: r(a.a), b: r(a.b) };
    case "fn": return { t: "fn", f: a.f === "log" ? "ln" : a.f, a: r(a.a) };
    case "call": {
      if (PD.includes(a.name) && a.args.length === 1) return d6(r(a.args[0]), a.name.slice(2)); // ∂/∂x: other letters constant
      const d = t.defs.get(a.name); if (!d || d.params.length !== a.args.length) throw new Unchecked(a.name); return subst(d.body, Object.fromEntries(d.params.map((p, i) => [p, r(a.args[i])]))); }
    case "Dcall": { const d = t.defs.get(a.name); if (!d || d.params.length !== 1) throw new Unchecked(a.name); let g = d.body; for (let i = 0; i < a.k; i++) g = d6(g, d.params[0]); return subst(g, { [d.params[0]]: r(a.arg) }); }
    case "D": {
      // d/dx of a letter the question does not define (dy/dx, d/dx(xy), dx/dt) may depend on x: not read
      const free = [...symbolsOf(a.of)].filter((n) => n !== a.v && !t.defs.has(n) && n !== "C0");
      if (free.length) throw new Unchecked("derivative of an unknown function");
      let g = r(a.of); for (let i = 0; i < a.k; i++) g = d6(g, a.v); return g; }
    case "EV": {
      const F = r(a.f);
      const at = (b: A): A => {
        if (b.t === "V") { if (b.k === "dne") throw new Unchecked("bound"); const L = limitOf(F, a.v, b.k, b.k === "inf" ? "left" : "right"); if (L.kind !== "finite") throw new Unchecked("limit"); return { t: "n", v: L.value }; }
        return subst(F, { [a.v]: r(b) });
      };
      return add(at(a.hi), neg(at(a.lo)));
    }
    case "LIM": {
      const pt = a.at === "inf" || a.at === "-inf" ? a.at : constQ(r(a.at)); if (!pt) throw new Unchecked("limit point");
      const L = limitOf(r(a.f), a.v, pt as Q | "inf" | "-inf", a.side); if (L.kind !== "finite") throw new Unchecked("limit");
      return { t: "n", v: L.value };
    }
    default: throw new Unchecked(a.t);
  }
}

type Verdict = "right" | "wrong" | "unchecked" | "label";

/** sample every letter at a few points; "differ" when the two sides visibly disagree at two or more */
function samples(F: A, names: string[]): "zero" | "differ" | "few" {
  let good = 0, off = 0;
  const pts = [0.37, 0.71, 1.13, 1.61, 2.23, 0.53];
  for (let i = 0; i < pts.length; i++) {
    const env = Object.fromEntries(names.map((n, j) => [n, pts[(i + j * 2) % pts.length] + 0.1 * j]));
    let y: number; try { y = evalNum(F, env); } catch { continue; }
    if (!Number.isFinite(y)) continue;
    good++; if (Math.abs(y) > 1e-7) off++;
  }
  return good >= 3 && off >= 2 ? "differ" : good >= 3 && off === 0 ? "zero" : "few";
}
/** L = R exactly; `claim` false for a relation between letters (y = 6 − 2x, x² = x + 6), which may be an equation to
 *  solve rather than an identity: then it is never called wrong */
function identity(L: A, R: A, claim = true, point?: Record<string, A>): Verdict {
  const F = add(L, neg(R));
  const names = [...symbolsOf(F)];
  try { if (compareExpr(F, N(0), names[0] ?? "x").status === "equal") return "right"; } catch { /* unproven */ }
  if (names.length && !claim) {
    // an expression worked out at the question's point (2x² + 4y² = 6 at (1, −1)): right when it holds there
    if (point && names.every((n) => n in point) && [L, R].some((s) => !symbolsOf(s).size)) {
      const at = subst(F, point);
      try { if (compareExpr(at, N(0), "x").status === "equal") return "right"; } catch { /* */ }
    }
    return "unchecked";
  }
  return samples(F, names) === "differ" ? "wrong" : "unchecked";
}
const OPS = ["I", "EV", "D", "LIM", "call", "Dcall"];
const hasOp = (a: A) => OPS.some((k) => hasNode(a, k));
/** ∫ₐᵇ f by Simpson's rule (only to call a value wrong, never right) */
function numericIntegral(f: A, v: string, lo: number, hi: number): number | null {
  const at = (x: number) => evalNum(f, { [v]: x });
  const simpson = (n: number) => { const h = (hi - lo) / n; let s = at(lo) + at(hi); for (let i = 1; i < n; i++) s += (i % 2 ? 4 : 2) * at(lo + i * h); return (s * h) / 3; };
  try { const a = simpson(400), b = simpson(800); return Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(b)) ? b : null; } catch { return null; }
}
/** an integral side split as c·∫ (c free of the integral) */
function asIntegral(a: A): { c: A; I: Extract<A, { t: "I" }> } | null {
  if (a.t === "I") return { c: N(1), I: a };
  if (a.t === "mul") { const i = a.xs.findIndex((x) => x.t === "I"); if (i >= 0 && a.xs.filter((x) => hasNode(x, "I")).length === 1) return { c: mul(...a.xs.filter((_, j) => j !== i)), I: a.xs[i] as Extract<A, { t: "I" }> }; }
  if (a.t === "neg") { const r = asIntegral(a.a); return r && { c: neg(r.c), I: r.I }; }
  return null;
}
const asBracket = (a: A): { c: A; E: Extract<A, { t: "EV" }> } | null => {
  if (a.t === "EV") return { c: N(1), E: a };
  if (a.t === "mul") { const i = a.xs.findIndex((x) => x.t === "EV"); if (i >= 0) return { c: mul(...a.xs.filter((_, j) => j !== i)), E: a.xs[i] as Extract<A, { t: "EV" }> }; }
  return null;
};

function pair(L0: A, R0: A, t: LineTask): Verdict {
  for (const [X, Y] of [[L0, R0], [R0, L0]]) {
    const ii = asIntegral(X);
    if (!ii) continue;
    const { c, I } = ii;
    const f = reduce(I.f, t);
    if (!I.lo) { // ∫ f dx = F + C: F′ = f
      const Yr = reduce(Y, t);
      return identity(mul(reduce(c, t), f), d6(Yr, I.v));
    }
    const b = asBracket(Y);
    if (b && json(b.E.lo) === json(I.lo) && json(b.E.hi) === json(I.hi)) { // ∫ₐᵇ f = [F]ₐᵇ: F′ = f, same factor
      const ok = identity(f, d6(reduce(b.E.f, t), I.v)), k = identity(reduce(c, t), reduce(b.c, t));
      return ok === "right" && k === "right" ? "right" : ok === "wrong" || k === "wrong" ? "wrong" : "unchecked";
    }
    // a value: only refuted numerically, never confirmed so
    try {
      const Yr = reduce(Y, t), cr = reduce(c, t);
      if (symbolsOf(Yr).size || symbolsOf(cr).size || I.lo.t === "V" || I.hi!.t === "V") return "unchecked";
      const val = numericIntegral(f, I.v, evalNum(reduce(I.lo, t), {}), evalNum(reduce(I.hi!, t), {}));
      if (val === null) return "unchecked";
      const want = evalNum(cr, {}) * val, got = evalNum(Yr, {});
      return Math.abs(want - got) > 1e-6 * Math.max(1, Math.abs(want)) ? "wrong" : "unchecked";
    } catch { return "unchecked"; }
  }
  if (hasNode(L0, "I") || hasNode(R0, "I")) return "unchecked";
  return identity(reduce(L0, t), reduce(R0, t), hasOp(L0) || hasOp(R0), t.point);
}

export function lineVerdicts(t: LineTask, lines: string[]): { verdicts: Verdict[]; last: A | null } {
  let last: A | null = null;
  const fns = new Set([...[...t.defs.entries()].filter(([, d]) => d.params.length).map(([k]) => k), ...PD]);
  const verdicts = lines.map((raw): Verdict => {
    try {
      const labelled = LABEL.test(raw);
      const parts = splitEquals(normalize(notation(labelled ? raw.replace(LABEL, "") : raw)));
      if (labelled && parts.length === 1) { last = parseExpression(parts[0], { fnNames: fns, variable: t.v }); return "label"; }
      const cont = parts[0].trim() === "";
      const sides = parts.filter((_, i) => !(cont && i === 0)).map((s) => parseExpression(s, { fnNames: fns, variable: t.v }));
      if (cont) { if (!last) return "unchecked"; sides.unshift(last); }
      if (sides.length < 2) return "unchecked";
      last = sides[sides.length - 1];
      const vs = sides.slice(1).map((R, i) => { try { return pair(sides[i], R, t); } catch { return "unchecked" as Verdict; } });
      return vs.includes("wrong") ? "wrong" : vs.every((v) => v === "right") ? "right" : "unchecked";
    } catch {
      return "unchecked";
    }
  });
  return { verdicts, last };
}

/** the working ends at the question's own answer (exactly) */
function endsAtAnswer(t: LineTask, last: A | null): boolean {
  if (!last || !t.answer) return false;
  try { return identity(reduce(last, t), reduce(t.answer, t)) === "right"; } catch { return false; }
}

export function lineWorking(qid: string, lines: string[], base: WorkingAssessment): WorkingAssessment {
  const t = lineTaskOf(qid);
  if (!t || !lines.length || base.status !== "unsupported") return base;
  const qq = question(qid);
  const { verdicts: v, last } = lineVerdicts(t, lines);
  const first = v.indexOf("wrong");
  let lead = 0;
  while (lead < v.length && (v[lead] === "right" || v[lead] === "label")) lead++;
  const status: WorkingAssessment["status"] = first >= 0 ? "invalid" : lead === v.length && v.includes("right") && endsAtAnswer(t, last) ? "verified" : v.includes("right") ? "partial" : "unsupported";
  return {
    ...base,
    statement: qq.prompt,
    status,
    methodEvidence: status === "verified" ? "method-verified" : status === "invalid" ? "method-false-step" : "no-method-evidence",
    completeness: status === "verified" ? "complete" : "incomplete",
    lines: lines.map((text, i) => ({ text, status: v[i] === "right" && (first < 0 || i < first) ? "certified-calculus" : i === first ? "invalid" : "unsupported", move: null })),
    firstInvalid: first < 0 ? null : { index: first, text: lines[first], from: first ? lines[first - 1] : qq.prompt, reason: "The two sides of this line are not equal." },
    workingAnswer: null,
    agreesWithResponse: null,
    substitution: null,
    certificates: status === "verified" ? [digest({ policy: LINE_WORKING, qid, lines })] : [],
    replayed: status === "verified",
    replayedLines: first >= 0 ? Math.min(lead, first) : lead,
    reason: status === "verified" ? "Every line is true and the working ends at the answer." : "",
    provenance: { schema: "working-provenance@1" as const, questionId: qid, competency: qq.competency, checker: "line-reasoner", version: LINE_WORKING, reasoning: status === "verified" ? "demonstrated" : status === "invalid" ? "refuted" : "not-established" },
  } as WorkingAssessment;
}
