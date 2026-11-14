/**
 * ode-working@1: a learner's working for a first-order differential equation with an initial condition ("Solve dy/dx + y/x = 6,
 * x > 0, given that y = −2 when x = 1"), judged line by line by putting the solution back in.
 *
 * The question's own (machine-checked) solution y = s(x) is the only y that satisfies the equation and the condition, so every
 * true line of a solution must hold when y is replaced by s(x): dy/dx by s′(x), the differentials dy and dx by s′(x) and 1,
 * a substitution variable (y = vx, v = y − 1) by what it then equals, and an indefinite integral by checking derivatives
 * (both sides of ∫ f(y) dy = ∫ g(x) dx agree up to a constant). A line with an arbitrary constant (C, c, K, A) is true when
 * ONE value of the constant makes it hold for every x; that value is read off at the initial point, and a later line that
 * only fixes the constant (C = 2) must give the same value. Every identity is decided by the exact kernel (e6-cas); a line is
 * called wrong only when, in addition, it visibly fails at sample points. Anything else is left unchecked, never called right.
 */
import { createHash } from "node:crypto";
import { question } from "../content.ts";
import { N, S, add, div, fn, mul, neg, normalize, parseExpression, splitEquals, type A } from "../e6-parse.ts";
import { compareExpr, d6, evalNum, hasVar } from "../e6-cas.ts";
import type { WorkingAssessment } from "./working.ts";

export const ODE_WORKING = "ode-working@1" as const;
const digest = (x: unknown) => createHash("sha256").update(JSON.stringify(x, (_k, v) => (typeof v === "bigint" ? v.toString() : v))).digest("hex");

export interface OdeTask { dep: string; ind: string; equation: [A, A]; x0: A; y0: A; solution: A }

/** the app's notation in the exact reader's words */
export function toOdeNotation(t: string): string {
  return t
    .replace(/[−–]/g, "-")
    .replace(/[×·]/g, "*")
    .replace(/tan⁻¹/g, "atan").replace(/sin⁻¹/g, "asin").replace(/cos⁻¹/g, "acos")
    .replace(/∫\s*d([a-z])\b(?!\s*\/)/g, "∫ 1 d$1")
    .replace(/∫\s*d([a-z])\s*\/\s*(\([^()]*\)|[a-z0-9]+)/g, "∫ 1/$2 d$1")
    .replace(/(?<![a-z])log\b/g, "ln")
    .replace(/(?<![a-z])eˣ/g, "e^x")
    .trim();
}
const read = (t: string, v: string): A => parseExpression(normalize(toOdeNotation(t)), { fnNames: new Set(), variable: v });

/** The equation, the initial condition and the solution a question states, or null. */
export function odeTaskFromQuestion(prompt: string, answer: string): OdeTask | null {
  const p = prompt.replace(/\s+/g, " ").replace(/[−–]/g, "-");
  const m = p.match(/^Solve (?:the (?:homogeneous )?differential equation )?(d([a-z])\/d([a-z]) .+?),? (?:for )?(?:[a-z] > 0,? )?(?:where [^,]*, )?given that (?:([a-z]) = (-?[\d/]+) when ([a-z]) = (-?[\d/]+)|([a-z])\((-?[\d/]+)\) = (-?[\d/]+))/);
  if (!m) return null;
  const dep = m[2], ind = m[3];
  const [atDep, y0, atInd, x0] = m[4] ? [m[4], m[5], m[6], m[7]] : [m[8], m[10], ind, m[9]];
  if (atDep !== dep || atInd !== ind) return null;
  try {
    const sides = splitEquals(normalize(toOdeNotation(m[1])));
    if (sides.length !== 2) return null;
    const equation = sides.map((s) => parseExpression(s, { fnNames: new Set(), variable: ind })) as [A, A];
    return { dep, ind, equation, x0: read(x0, ind), y0: read(y0, ind), solution: read(answer, ind) };
  } catch {
    return null;
  }
}

/** The task of a question (by id), or null. A multiple-choice form is judged on its typed form. */
export function odeTaskOf(qid: string): OdeTask | null {
  try {
    const q = question(qid.replace(/:mc$/, ""));
    return q.type === "choice" ? null : odeTaskFromQuestion(q.prompt, String(q.answer));
  } catch {
    return null;
  }
}

class Unchecked extends Error {}
const CONSTANTS = new Set(["C", "c", "K", "A", "B"]);
const K = "K0"; // every arbitrary constant, as one symbol

interface Env { t: OdeTask; subs: Map<string, A> } // a variable's value along the solution (dep → s(x), v → …)

function symbols(a: A, out = new Set<string>()): Set<string> {
  if (a.t === "s") out.add(a.name);
  for (const v of Object.values(a)) {
    if (Array.isArray(v)) v.forEach((x) => x && typeof x === "object" && "t" in x && symbols(x as A, out));
    else if (v && typeof v === "object" && "t" in (v as object)) symbols(v as A, out);
  }
  return out;
}

/** a along the solution: y → s(x), dy/dx → s′(x), dy → s′(x), dx → 1, constants → K0; an integral is not allowed here */
function along(a: A, e: Env): A {
  const r = (x: A) => along(x, e);
  const x = e.t.ind;
  switch (a.t) {
    case "n": case "pi": case "e": return a;
    case "C": return S(K);
    case "s": {
      if (a.name === x) return a;
      if (CONSTANTS.has(a.name)) return S(K);
      const v = e.subs.get(a.name); if (v) return v;
      if (a.name === `d${x}`) return N(1);
      if (a.name.startsWith("d") && e.subs.has(a.name.slice(1))) return d6(e.subs.get(a.name.slice(1))!, x);
      throw new Unchecked(`the symbol ${a.name}`);
    }
    case "neg": return neg(r(a.a));
    case "add": return add(...a.xs.map(r));
    case "mul": return mul(...a.xs.map(r));
    case "div": return div(r(a.a), r(a.b));
    case "pow": return { t: "pow", a: r(a.a), b: r(a.b) };
    case "fn": return a.f === "log" ? fn("ln", r(a.a)) : fn(a.f, r(a.a));
    case "D": {
      if (a.v !== x && !(e.subs.has(a.v))) throw new Unchecked("a derivative in another variable");
      let out = r(a.of);
      for (let k = 0; k < a.k; k++) out = d6(out, x);
      if (a.v !== x) out = div(out, d6(e.subs.get(a.v)!, x)); // d/dv = (d/dx)/(dv/dx)
      return out;
    }
    default: throw new Unchecked("this notation");
  }
}

/** d/dx of a along the solution, where an indefinite integral ∫ f(w) dw contributes f(w)·w′ (it is only fixed up to a constant) */
function slope(a: A, e: Env): A {
  const x = e.t.ind;
  const hasI = (z: A): boolean => z.t === "I" || Object.values(z).some((v) => (Array.isArray(v) ? v.some((u) => u && typeof u === "object" && "t" in u && hasI(u as A)) : v && typeof v === "object" && "t" in (v as object) && hasI(v as A)));
  if (!hasI(a)) return d6(along(a, e), x);
  switch (a.t) {
    case "I": {
      if (a.lo || a.hi) throw new Unchecked("a definite integral");
      const w = a.v === x ? S(x) : e.subs.get(a.v); if (!w) throw new Unchecked("an integral in an unknown variable");
      return mul(along(a.f, e), a.v === x ? N(1) : d6(w, x));
    }
    case "neg": return neg(slope(a.a, e));
    case "add": return add(...a.xs.map((z) => slope(z, e)));
    case "mul": { const i = a.xs.findIndex(hasI); const rest = a.xs.filter((_, j) => j !== i); if (rest.some(hasI) || rest.some((z) => hasVar(along(z, e), x))) throw new Unchecked("a product with an integral"); return mul(...rest.map((z) => along(z, e)), slope(a.xs[i], e)); }
    default: throw new Unchecked("this integral");
  }
}

const substituteK = (a: A, val: A): A => JSON.parse(JSON.stringify(a, (_k, v) => (typeof v === "bigint" ? `${v}n` : v)), (_k, v) => (typeof v === "string" && /^-?\d+n$/.test(v) ? BigInt(v.slice(0, -1)) : v && typeof v === "object" && v.t === "s" && v.name === K ? val : v));
const atX = (a: A, x: string, x0: A): A => JSON.parse(JSON.stringify(a, (_k, v) => (typeof v === "bigint" ? `${v}n` : v)), (_k, v) => (typeof v === "string" && /^-?\d+n$/.test(v) ? BigInt(v.slice(0, -1)) : v && typeof v === "object" && v.t === "s" && v.name === x ? x0 : v));
const zero = (a: A, v: string) => { try { return compareExpr(a, N(0), v).status === "equal"; } catch { return false; } };
/** a line is wrong only where it visibly fails NEAR the initial point: the solution is only claimed on the interval around
 *  it (tan⁻¹(tan x) = x holds there and fails far away), so the samples stay within 0.25 of it */
let X0 = 0;
const visiblyNonzero = (a: A, v: string) => {
  let good = 0, off = 0;
  for (const d of [0.05, -0.05, 0.1, -0.1, 0.15, 0.2, -0.15, 0.25]) {
    let y: number; try { y = evalNum(a, { [v]: X0 + d }); } catch { continue; }
    if (!Number.isFinite(y)) continue;
    good++; if (Math.abs(y) > 1e-6) off++;
  }
  return good >= 3 && off >= 2;
};

type Verdict = "right" | "wrong" | "unchecked" | "definition";

/** one relation L = R of a line, along the solution; `k` carries the constant's value between lines */
function relation(L: A, R: A, e: Env, k: { value: A | null }): Verdict {
  const x = e.t.ind;
  const integral = JSON.stringify(L, (_k, v) => (typeof v === "bigint" ? 0 : v)).includes('"t":"I"') || JSON.stringify(R, (_k, v) => (typeof v === "bigint" ? 0 : v)).includes('"t":"I"');
  const F = integral ? add(slope(L, e), neg(slope(R, e))) : add(along(L, e), neg(along(R, e)));
  const withK = symbols(F).has(K);
  if (!withK) return zero(F, x) ? "right" : visiblyNonzero(F, x) ? "wrong" : "unchecked";
  if (!hasVar(F, x)) { // a line that only fixes the constant: it must agree with the value the working has used
    if (!k.value) return "unchecked";
    const G = substituteK(F, k.value);
    return zero(G, x) ? "right" : visiblyNonzero(G, x) ? "wrong" : "unchecked";
  }
  // the one value of the constant that makes the line hold at the initial point, if the line is linear in it
  const G = atX(F, x, e.t.x0), b = substituteK(G, N(0)), a = add(substituteK(G, N(1)), neg(b));
  try { if (compareExpr(G, add(mul(a, S(K)), b), K).status !== "equal" || zero(a, x)) return "unchecked"; } catch { return "unchecked"; }
  const value = div(neg(b), a);
  const H = substituteK(F, value);
  if (zero(H, x)) { k.value = value; return "right"; }
  return visiblyNonzero(H, x) ? "wrong" : "unchecked";
}

/** a line that introduces a substitution (y = vx, v = y − 1); null when the line is not one */
function definition(sides: A[], e: Env): boolean {
  if (sides.length !== 2) return false;
  const x = e.t.ind, y = e.t.dep;
  const known = new Set([x, y, ...CONSTANTS, ...e.subs.keys(), `d${x}`, `d${y}`]);
  const fresh = [...symbols(sides[0]), ...symbols(sides[1])].filter((s) => !known.has(s) && !s.startsWith("d"));
  if (fresh.length !== 1) return false;
  const v = fresh[0];
  for (const [l, r] of [[sides[0], sides[1]], [sides[1], sides[0]]]) {
    if (l.t === "s" && l.name === v && !symbols(r).has(v)) { e.subs.set(v, along(r, e)); return true; }
    if (l.t === "s" && l.name === y && symbols(r).has(v)) { // y = E(v, x), linear in v
      const E = r, at = (val: A) => JSON.parse(JSON.stringify(E, (_k, z) => (typeof z === "bigint" ? `${z}n` : z)), (_k, z) => (typeof z === "string" && /^-?\d+n$/.test(z) ? BigInt(z.slice(0, -1)) : z && typeof z === "object" && z.t === "s" && z.name === v ? val : z)) as A;
      const b = at(N(0)), a = add(at(N(1)), neg(b));
      try { if (compareExpr(E, add(mul(a, S(v)), b), v).status !== "equal") return false; } catch { return false; }
      e.subs.set(v, div(add(e.t.solution, neg(along(b, e))), along(a, e)));
      return true;
    }
  }
  return false;
}

export function odeVerdicts(t: OdeTask, lines: string[]): Verdict[] {
  const e: Env = { t, subs: new Map([[t.dep, t.solution]]) };
  const k = { value: null as A | null };
  try { X0 = evalNum(t.x0, {}); } catch { X0 = 0; }
  let last: A | null = null;
  return lines.map((raw) => {
    try {
      const text = toOdeNotation(raw).replace(/^(?:let|put|substitute|set|take|where)\s+/i, "");
      const parts = splitEquals(normalize(text));
      const cont = parts[0].trim() === "";
      const sides = parts.filter((s, i) => !(cont && i === 0)).map((s) => parseExpression(s, { fnNames: new Set(), variable: t.ind }));
      if (cont) { if (!last) return "unchecked"; sides.unshift(last); }
      if (sides.length < 2) return "unchecked";
      last = sides[sides.length - 1];
      if (!cont && definition(sides, e)) return "definition";
      const vs = sides.slice(1).map((R, i) => relation(sides[i], R, e, k));
      return vs.includes("wrong") ? "wrong" : vs.every((v) => v === "right") ? "right" : "unchecked";
    } catch {
      return "unchecked";
    }
  });
}

/** the question's own solution, put back into its equation, makes it an identity (a check on the task as read) */
export function solutionSatisfies(t: OdeTask): boolean {
  const e: Env = { t, subs: new Map([[t.dep, t.solution]]) };
  try { X0 = evalNum(t.x0, {}); } catch { X0 = 0; }
  try { return relation(t.equation[0], t.equation[1], e, { value: null }) === "right" && zero(add(atX(t.solution, t.ind, t.x0), neg(t.y0)), t.ind); } catch { return false; }
}

export const isOdeWorking = (qid: string) => !!odeTaskOf(qid);

/** WorkingAssessment for differential-equation working; `base` is returned untouched unless it is unsupported */
export function odeWorking(qid: string, lines: string[], base: WorkingAssessment): WorkingAssessment {
  const t = odeTaskOf(qid);
  if (!t || !lines.length || base.status !== "unsupported") return base;
  const q = question(qid);
  const v = odeVerdicts(t, lines);
  const first = v.indexOf("wrong");
  let lead = 0;
  while (lead < v.length && (v[lead] === "right" || v[lead] === "definition")) lead++;
  const allRight = first < 0 && lead === v.length && v.includes("right");
  const status: WorkingAssessment["status"] = first >= 0 ? "invalid" : allRight ? "verified" : v.includes("right") ? "partial" : "unsupported";
  const provenance = { schema: "working-provenance@1" as const, questionId: qid, competency: q.competency, checker: "ode-reasoner", version: ODE_WORKING, reasoning: status === "verified" ? "demonstrated" : status === "invalid" ? "refuted" : "not-established" };
  return {
    ...base,
    statement: q.prompt,
    status,
    methodEvidence: status === "verified" ? "method-verified" : status === "invalid" ? "method-false-step" : "no-method-evidence",
    completeness: status === "verified" ? "complete" : "incomplete",
    lines: lines.map((text, i) => ({ text, status: (v[i] === "right" || v[i] === "definition") && (first < 0 || i < first) ? "certified-calculus" : i === first ? "invalid" : "unsupported", move: null })),
    firstInvalid: first < 0 ? null : { index: first, text: lines[first], from: first ? lines[first - 1] : q.prompt, reason: "This line is not true for the solution of the equation: putting the solution back in, the two sides differ." },
    workingAnswer: null,
    agreesWithResponse: null,
    substitution: null,
    certificates: status === "verified" ? [digest({ policy: ODE_WORKING, qid, lines })] : [],
    replayed: status === "verified",
    replayedLines: first >= 0 ? Math.min(lead, first) : lead,
    reason: status === "verified" ? "Every line holds for the solution of the equation." : "",
    provenance,
  } as WorkingAssessment;
}
