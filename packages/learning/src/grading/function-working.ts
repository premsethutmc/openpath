/**
 * function-working@1: a learner's working about one named function (f(x) = 2x³ − 12x² + 1, the curve y = …): where it
 * increases, its turning points, maximum and minimum values, concavity, tangents, Rolle / mean value points.
 *
 * Every line is read with the function put in: f(a) is its value at a, f′(x) and d²y/dx² its derivatives, y the function.
 *  - an identity in x (f′(x) = 6x² − 24x = 6x(x − 4)) is checked exactly;
 *  - a value (f(4) = 128 − 192 + 1 = −63) is checked exactly;
 *  - a condition (6x(x − 4) = 0) is right when it is a constant multiple of f, f′, f″ or the condition before it, or one
 *    of its factors (a branch);
 *  - a list of solutions (x = 0 or x = 4) is right only when it is exactly the set of real roots of the condition before it
 *    (or of f′, f″): every value a root, and no root left out.
 * A line is called wrong only when it is false (values differ, an identity fails at sample points, a listed value is not a
 * root). Conclusions in words and intervals are left to the answer, which is graded on its own. Anything else is unchecked.
 */
import { createHash } from "node:crypto";
import { question } from "../content.ts";
import { N, add, neg, normalize, parseExpression, splitEquals, type A } from "../e6-parse.ts";
import { compareExpr, d6, hasVar, numericDisagree } from "../e6-cas.ts";
import { constQ, polyCoeffs } from "../e6-calc.ts";
import { q, qadd, qdiv, qeq, qiszero, qmul, qneg, qsign, qsub, ONE, Z, type Q } from "../exact-e5.ts";
import type { WorkingAssessment } from "./working.ts";

export const FUNCTION_WORKING = "function-working@1" as const;
const digest = (x: unknown) => createHash("sha256").update(JSON.stringify(x, (_k, v) => (typeof v === "bigint" ? v.toString() : v))).digest("hex");

export interface FunctionTask { name: string; v: string; f: A }

const notation = (t: string) => t
  .replace(/[−–]/g, "-").replace(/[×·]/g, "*").replace(/′/g, "'").replace(/″/g, "''")
  .replace(/d²([a-z])\/d([a-z])²/g, "$1''")
  .replace(/(?<![a-z])log\b/g, "ln")
  .replace(/⇒|=>|∴|\btherefore\b|\bso\b/gi, ";")
  .trim();
const read = (t: string, v: string, name: string): A => parseExpression(normalize(notation(t)), { fnNames: new Set([name]), variable: v });

/** The function a question is about, or null: "f(x) = …", "R(x) = …", "the curve y = …", "s = t² + …". */
export function functionTaskFromPrompt(prompt: string): FunctionTask | null {
  const p = prompt.replace(/\s+/g, " ");
  // only questions about a function's derivative; not piecewise functions, differential equations, areas or volumes,
  // whose working names other curves and points (x = −4 there is a bound, not a turning point)
  if (!/increasing|decreasing|maximum|minimum|concave|critical|tangent|normal|f′|f'|mean value|Rolle|marginal|second-derivative|rate of change/i.test(p)) return null;
  if (/ for [a-z] [<>≤≥]|differential equation|\bd[xy]\b|area|volume|rotated|lim\b/i.test(p)) return null;
  const m = p.match(/\b([a-zA-Z])\(([a-z])\) = (.+?)(?= is | on | satisfies| at |, |\. |\.$| for |\?)/) ?? p.match(/\b(y) = (.+?)(?= is | at |, |\. |\.$)/);
  if (!m) return null;
  const [name, v, text] = m.length === 4 && m[3] !== undefined ? [m[1], m[2], m[3]] : ["y", "x", m[2]];
  try {
    const f = read(text, v, name);
    return polyCoeffs(f, v) ? { name, v, f } : null; // polynomials: every check below is then exact
  } catch {
    return null;
  }
}

export function functionTaskOf(qid: string): FunctionTask | null {
  try { return functionTaskFromPrompt(question(qid.replace(/:mc$/, "")).prompt); } catch { return null; }
}

class Unchecked extends Error {}
const clone = (a: A, at: string, val: A): A => JSON.parse(JSON.stringify(a, (_k, v) => (typeof v === "bigint" ? `${v}n` : v)), (_k, v) => (typeof v === "string" && /^-?\d+n$/.test(v) ? BigInt(v.slice(0, -1)) : v && typeof v === "object" && v.t === "s" && v.name === at ? val : v));
const deriv = (t: FunctionTask, k: number) => { let g = t.f; for (let i = 0; i < k; i++) g = d6(g, t.v); return g; };

/** a, with the function put in */
function put(a: A, t: FunctionTask): A {
  const r = (x: A) => put(x, t);
  switch (a.t) {
    case "n": case "pi": case "e": return a;
    case "s": if (a.name === t.v) return a; throw new Unchecked(a.name); // a bare y may be a tangent's or another curve's y
    case "neg": return neg(r(a.a));
    case "add": return { t: "add", xs: a.xs.map(r) };
    case "mul": return { t: "mul", xs: a.xs.map(r) };
    case "div": return { t: "div", a: r(a.a), b: r(a.b) };
    case "pow": return { t: "pow", a: r(a.a), b: r(a.b) };
    case "fn": return { t: "fn", f: a.f, a: r(a.a) };
    case "call": if (a.name !== t.name || a.args.length !== 1) throw new Unchecked(a.name); return clone(t.f, t.v, r(a.args[0]));
    case "Dcall": if (a.name !== t.name) throw new Unchecked(a.name); return clone(deriv(t, a.k), t.v, r(a.arg));
    case "D": if (a.v !== t.v || !(a.of.t === "s" && a.of.name === t.name)) throw new Unchecked("derivative"); return deriv(t, a.k);
    default: throw new Unchecked("notation");
  }
}

// ---------------------------------------------------------------------------------------------- exact polynomial helpers
const trim = (c: Q[]) => { const o = c.slice(); while (o.length > 1 && qiszero(o[o.length - 1])) o.pop(); return o; };
const isZeroP = (c: Q[]) => c.every(qiszero);
/** a = b·quotient + remainder */
function divmod(a: Q[], b: Q[]): { quo: Q[]; rem: Q[] } {
  let r = trim(a); const d = trim(b), out: Q[] = new Array(Math.max(1, r.length - d.length + 1)).fill(Z);
  while (r.length >= d.length && !isZeroP(r)) {
    const k = r.length - d.length, c = qdiv(r[r.length - 1], d[d.length - 1]); out[k] = c;
    r = trim(r.map((x, i) => (i >= k && i - k < d.length ? qsub(x, qmul(c, d[i - k])) : x)));
    if (r.length < d.length || (r.length === 1 && qiszero(r[0]))) break;
  }
  return { quo: trim(out), rem: r };
}
const isMultiple = (a: Q[], b: Q[]) => { const A2 = trim(a), B = trim(b); if (A2.length !== B.length || isZeroP(B)) return false; const k = qdiv(A2[A2.length - 1], B[B.length - 1]); return A2.every((x, i) => qeq(x, qmul(k, B[i]))); };
const divides = (p: Q[], g: Q[]) => trim(p).length > 1 && !isZeroP(g) && isZeroP(divmod(g, p).rem);
const evalP = (c: Q[], x: Q) => c.reduceRight((acc, k) => qadd(qmul(acc, x), k), Z);
const exactSqrt = (x: Q): Q | null => {
  if (qsign(x) < 0) return null;
  const rt = (n: bigint) => { let lo = 0n, hi = n + 1n; while (lo < hi) { const m = (lo + hi) / 2n; if (m * m < n) lo = m + 1n; else hi = m; } return lo * lo === n ? lo : null; };
  const a = rt(x.n), b = rt(x.d); return a !== null && b !== null ? q(a, b) : null;
};
/** the distinct real roots of g when they are all rational and few (degree ≤ 2 after taking the given ones out), else null */
function rootsComplete(g: Q[], values: Q[]): boolean | null {
  let h = trim(g);
  for (const v of values) { const { quo, rem } = divmod(h, [qneg(v), ONE]); if (!isZeroP(rem)) return false; h = quo; while (true) { const d = divmod(h, [qneg(v), ONE]); if (!isZeroP(d.rem) || trim(h).length <= 1) break; h = d.quo; } }
  h = trim(h);
  if (h.length === 1) return true;
  const inSet = (r: Q) => values.some((v) => qeq(v, r));
  if (h.length === 2) return inSet(qneg(qdiv(h[0], h[1])));
  if (h.length === 3) {
    const [c, b, a] = h, disc = qsub(qmul(b, b), qmul(q(4n), qmul(a, c)));
    if (qsign(disc) < 0) return true;
    const s = exactSqrt(disc); if (!s) return false; // irrational roots, not listed
    return inSet(qdiv(qadd(qneg(b), s), qmul(q(2n), a))) && inSet(qdiv(qsub(qneg(b), s), qmul(q(2n), a)));
  }
  return null;
}

type Verdict = "right" | "wrong" | "unchecked";

export function functionVerdicts(t: FunctionTask, lines: string[]): Verdict[] {
  const conditions: Q[][] = [0, 1, 2].map((k) => polyCoeffs(deriv(t, k), t.v)).filter((c): c is Q[] => !!c && trim(c).length > 1);
  let last: A | null = null;
  return lines.map((raw) => {
    try {
      const text = notation(raw);
      // a list of solutions: x = 0 or x = 4, x = 0, 4
      const list = text.match(new RegExp(`^${t.v}\\s*=\\s*(.+)$`));
      if (list && (/\bor\b|,|\band\b/.test(list[1]) || constQ(read(list[1], t.v, t.name)))) {
        const vals = list[1].split(new RegExp(`\\s*(?:\\bor\\b|\\band\\b|,)\\s*(?:${t.v}\\s*=\\s*)?`)).map((s) => constQ(read(s, t.v, t.name)));
        if (vals.some((v) => !v)) return "unchecked";
        const pool = conditions.slice().reverse();
        for (const g of pool) { const c = rootsComplete(g, vals as Q[]); if (c) return "right"; }
        return pool.some((g) => (vals as Q[]).every((v) => qiszero(evalP(g, v)))) ? "unchecked" : "wrong"; // some roots, not all: incomplete
      }
      const parts = splitEquals(normalize(text));
      const cont = parts[0].trim() === "";
      const raw2 = parts.filter((_, i) => !(cont && i === 0)).map((s) => read(s, t.v, t.name));
      const mentions = (a: A): boolean => a.t === "call" || a.t === "Dcall" || a.t === "D" || Object.values(a).some((v) => (Array.isArray(v) ? v.some((u) => u && typeof u === "object" && "t" in u && mentions(u as A)) : v && typeof v === "object" && "t" in (v as object) && mentions(v as A)));
      // f′(x) = 6x² − 12x claims an identity; only an equation in x alone, or "f′(x) = 0", is a condition to solve
      const isZero = (a: A) => { const c = constQ(a); return !!c && qiszero(c); };
      const identityClaim = raw2.some(mentions) && !(raw2.length === 2 && raw2.some(isZero));
      const sides = raw2.map((a) => put(a, t));
      if (cont) { if (!last) return "unchecked"; sides.unshift(last); }
      if (sides.length < 2) return "unchecked";
      last = sides[sides.length - 1];
      const out: Verdict[] = [];
      for (let i = 0; i + 1 < sides.length; i++) {
        const F = add(sides[i], neg(sides[i + 1]));
        let eq = false; try { eq = compareExpr(F, N(0), t.v).status === "equal"; } catch { /* unproven */ }
        if (eq) { out.push("right"); continue; }
        if (!hasVar(F, t.v)) { let off = false; try { off = numericDisagree(F, N(0), t.v) === "differ"; } catch { /* */ } out.push(off ? "wrong" : "unchecked"); continue; }
        // a condition to solve: a multiple or a factor of what is being solved
        if (identityClaim) { let off = false; try { off = numericDisagree(F, N(0), t.v) === "differ"; } catch { /* */ } out.push(off ? "wrong" : "unchecked"); continue; }
        const p = polyCoeffs(F, t.v);
        if (p && conditions.some((g) => isMultiple(p, g) || divides(p, g))) { conditions.push(p); out.push("right"); continue; }
        out.push(cont || i > 0 ? "wrong" : "unchecked"); // a chain of = must be identities; a lone new equation may be a step we cannot place
      }
      return out.includes("wrong") ? "wrong" : out.every((v) => v === "right") ? "right" : "unchecked";
    } catch {
      return "unchecked";
    }
  });
}

export const isFunctionWorking = (qid: string) => !!functionTaskOf(qid);

export function functionWorking(qid: string, lines: string[], base: WorkingAssessment): WorkingAssessment {
  const t = functionTaskOf(qid);
  if (!t || !lines.length || base.status !== "unsupported") return base;
  const qq = question(qid);
  const v = functionVerdicts(t, lines);
  const first = v.indexOf("wrong");
  let lead = 0;
  while (lead < v.length && v[lead] === "right") lead++;
  const allRight = first < 0 && lead === v.length;
  const status: WorkingAssessment["status"] = first >= 0 ? "invalid" : allRight ? "verified" : v.includes("right") ? "partial" : "unsupported";
  return {
    ...base,
    statement: qq.prompt,
    status,
    methodEvidence: status === "verified" ? "method-verified" : status === "invalid" ? "method-false-step" : "no-method-evidence",
    completeness: status === "verified" ? "complete" : "incomplete",
    lines: lines.map((text, i) => ({ text, status: v[i] === "right" && (first < 0 || i < first) ? "certified-calculus" : i === first ? "invalid" : "unsupported", move: null })),
    firstInvalid: first < 0 ? null : { index: first, text: lines[first], from: first ? lines[first - 1] : qq.prompt, reason: "This line is not true for the function in the question.", lost: null, gained: null },
    workingAnswer: null,
    agreesWithResponse: null,
    substitution: null,
    certificates: status === "verified" ? [digest({ policy: FUNCTION_WORKING, qid, lines })] : [],
    replayed: status === "verified",
    replayedLines: first >= 0 ? Math.min(lead, first) : lead,
    reason: status === "verified" ? "Every line is true for the function in the question." : "",
    provenance: { schema: "working-provenance@1" as const, questionId: qid, competency: qq.competency, checker: "function-reasoner", version: FUNCTION_WORKING, reasoning: status === "verified" ? "demonstrated" : status === "invalid" ? "refuted" : "not-established" },
  } as WorkingAssessment;
}
