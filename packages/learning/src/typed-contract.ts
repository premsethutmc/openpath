/**
 * Typed generator contracts: one adapter between a generator's own mathematical object and the typed kernels that already exist.
 * The generator hands over the object (linear-algebra data, complex data) built from its parameters; the kernel computes the expected value itself;
 * the student's typed answer is read into the same kind of value as the kernel's expected value (a bounded reader: rationals, tuples, matrices, simple radicals),
 * and the kernel's own step check decides. Anything the reader cannot read is "unread" (no credit, never wrong). Nothing here solves or parses prompt text.
 */
import { checkLinearAlgebraStep, expectedLinearAlgebra, type LAProblem, type LAValue } from "./linear-algebra-kernel.ts";
import { checkComplexStep, expectedComplex, type ComplexProblem, type ComplexValue } from "./complex-kernel.ts";
import { parseRational } from "./math-kernel.ts";
import { assessProbabilityStatistics, type B1Problem, type Exact as B1Exact } from "./probability-statistics.ts";
import { assessM2Working, type M2Problem, type M2Result } from "./domains-m2.ts";

export type TypedObject =
  | { capability: "linear-algebra"; problem: LAProblem }
  | { capability: "complex"; problem: ComplexProblem }
  | { capability: "probability-statistics"; problem: B1Problem }
  | { capability: "m2"; problem: M2Problem };
export type TypedVerdict = "verified" | "rejected" | "unsupported";
export interface TypedCapability<P, V> {
  id: TypedObject["capability"];
  /** the values a typed answer may denote, read in the kernel's own kinds (empty: not readable in any); never guessed */
  candidates(p: P, text: string): V[];
  /** the kernel's own check of one value */
  check(p: P, v: V): TypedVerdict;
  /** whether the kernel can compute and show the expected value from the object (only used to report) */
  has?(p: P): boolean;
}

const norm = (s: string) => s.replace(/[−–—]/g, "-").replace(/\s+/g, " ").trim().replace(/[.。]$/, "");
const rat = (s: string): string | null => { const r = parseRational(s); return r ? (r.denBig === 1n ? `${r.numBig}` : `${r.numBig}/${r.denBig}`) : null; };
/** "(a, b, c)", "[a, b, c]", "a, b, c" → rationals */
function tuple(text: string): string[] | null {
  let s = norm(text);
  const m = s.match(/^[([{]\s*(.*?)\s*[)\]}]$/);
  if (m) s = m[1];
  if (/[()[\]{}]/.test(s) || !s) return null;
  const parts = s.split(/\s*,\s*/).map(rat);
  return parts.every((p) => p !== null) ? (parts as string[]) : null;
}
/** "[[a, b], [c, d]]" → rows of rationals (rectangular) */
function matrix(text: string): string[][] | null {
  const s = norm(text);
  const m = s.match(/^[([]\s*(.*)\s*[)\]]$/);
  if (!m) return null;
  const rows = [...m[1].matchAll(/[([]\s*([^()[\]]*?)\s*[)\]]/g)].map((r) => tuple(`(${r[1]})`));
  if (!rows.length || rows.some((r) => r === null)) return null;
  const rs = rows as string[][];
  if (m[1].replace(/[([]\s*[^()[\]]*?\s*[)\]]/g, "").replace(/[\s,;]/g, "")) return null; // nothing but the rows
  return rs.every((r) => r.length === rs[0].length) ? rs : null;
}
/** k√n, √n, k√n/d, √(n)/d, a plain non-negative rational r (= √(r²)) → the radicand of the value ("54" for 3√6). A negative value is returned as a scalar (so it is judged, not unread). */
function radical(text: string): LAValue | null {
  const s = norm(text).replace(/\s+/g, "");
  if (/^-/.test(s)) { const r = rat(s); return r ? { kind: "scalar", value: r } : null; }
  const plain = rat(s);
  if (plain !== null) { const r = parseRational(plain)!; return { kind: "radical", radicand: String(r.mul(r).denBig === 1n ? r.mul(r).numBig : `${r.mul(r).numBig}/${r.mul(r).denBig}`) }; }
  const m = s.match(/^(\d+(?:\/\d+)?)?\*?√\(?(\d+)\)?(?:\/(\d+))?$/);
  if (!m) return null;
  const c = parseRational(m[1] ?? "1"), n = parseRational(m[2]), d = parseRational(m[3] ?? "1");
  if (!c || !n || !d || d.isZero()) return null;
  const k = c.div(d), sq = k.mul(k).mul(n);
  return { kind: "radical", radicand: sq.denBig === 1n ? `${sq.numBig}` : `${sq.numBig}/${sq.denBig}` };
}

const linearAlgebra: TypedCapability<LAProblem, LAValue> = {
  id: "linear-algebra",
  candidates(p, t) {
    let want: LAValue | null = null;
    try { want = expectedLinearAlgebra(p); } catch { return []; }
    if (!want) return [];
    switch (want.kind) {
      case "scalar": { const r = rat(norm(t)); return r === null ? [] : [{ kind: "scalar", value: r }]; }
      case "radical": { const r = radical(t); return r ? [r] : []; }
      case "vector": { const v = tuple(t); return v ? [{ kind: "vector", value: v }] : []; }
      case "matrix": { const m = matrix(t); return m ? [{ kind: "matrix", value: m }] : []; }
      case "system": { if (want.status !== "unique") return []; const v = tuple(t); return v ? [{ kind: "system", status: "unique", values: v }] : []; }
      default: return []; // booleans and non-unique systems are statements, not typed answers
    }
  },
  check(p, v) { const r = checkLinearAlgebraStep(p, { id: "answer", rule: "direct", result: v }); return r.outcome === "verified" ? "verified" : r.outcome === "rejected" ? "rejected" : "unsupported"; },
};

const complex: TypedCapability<ComplexProblem, ComplexValue> = {
  id: "complex",
  candidates(p, t) {
    let want: ComplexValue | null = null;
    try { want = expectedComplex(p); } catch { return []; }
    if (!want) return [];
    if (want.kind === "complex") { const v = tuple(t); return v && v.length === 2 ? [{ kind: "complex", value: { re: v[0], im: v[1] } }] : []; }
    if (want.kind === "scalar") { const r = rat(norm(t)); return r === null ? [] : [{ kind: "scalar", value: r }]; }
    if (want.kind === "radical") { const r = radical(t); return r && r.kind === "radical" ? [{ kind: "radical", radicand: r.radicand }] : r && r.kind === "scalar" ? [{ kind: "scalar", value: r.value }] : []; }
    return [];
  },
  check(p, v) { const r = checkComplexStep(p, { id: "answer", rule: "direct", result: v }); return r.outcome === "verified" ? "verified" : r.outcome === "rejected" ? "rejected" : "unsupported"; },
};

/** B1 keeps integer and rational results apart, so a number is offered in both kinds; the kernel decides on value */
const probabilityStatistics: TypedCapability<B1Problem, B1Exact> = {
  id: "probability-statistics",
  candidates(_p, t) {
    const s = norm(t), r = rat(s), out: B1Exact[] = [];
    if (r !== null) { const q = parseRational(r)!; out.push(...(q.denBig === 1n ? [{ kind: "integer", value: r } as const, { kind: "rational", value: r } as const] : [{ kind: "rational", value: r } as const])); }
    // a plain non-negative number may also be an exact root (a standard deviation of 8 is the radical of 64); the kernel keeps the kinds apart
    const x = radical(s);
    if (x && x.kind === "radical") out.push({ kind: "radical", radicand: x.radicand });
    return out;
  },
  check(p, v) {
    const a = assessProbabilityStatistics(p, [{ id: "answer", rule: "direct", result: v }]);
    return a.classification === "verified" ? "verified" : a.classification === "invalid" ? "rejected" : "unsupported";
  },
};

/** an exact value written as a rational plus rational multiples of square roots: "181", "-3/2", "3√35", "2-√3", "√3/2" (a single level of √ only; anything else is not read) */
function m2Exact(text: string): { rational: string; radicals?: { coefficient: string; radicand: number; index: number }[] } | null {
  const s = norm(text).replace(/\s+/g, "");
  if (!s || /[^0-9+\-/.√*()]/.test(s)) return null;
  let rational = parseRational("0")!;
  const roots = new Map<number, ReturnType<typeof parseRational> & {}>();
  for (const term of s.match(/[+-]?[^+-]+/g) ?? []) {
    if (!/√/.test(term)) { const r = parseRational(term.replace(/^\+/, "")); if (!r) return null; rational = rational.add(r); continue; }
    const m = term.match(/^([+-]?)(\d+(?:\.\d+)?(?:\/\d+)?)?\*?√\(?(\d+)\)?(?:\/(\d+))?$/);
    if (!m) return null;
    const c = parseRational(m[2] ?? "1"), d = parseRational(m[4] ?? "1");
    if (!c || !d || d.isZero()) return null;
    let k = c.div(d); if (m[1] === "-") k = k.neg();
    const n = Number(m[3]); roots.set(n, (roots.get(n) ?? parseRational("0")!).add(k));
  }
  const radicals = [...roots].filter(([, k]) => !k.isZero()).sort((a, b) => a[0] - b[0]).map(([radicand, k]) => ({ coefficient: k.denBig === 1n ? `${k.numBig}` : `${k.numBig}/${k.denBig}`, radicand, index: 2 }));
  const r = rational.denBig === 1n ? `${rational.numBig}` : `${rational.numBig}/${rational.denBig}`;
  return radicals.length ? { rational: r, radicals } : { rational: r };
}
const listOf = (t: string): string[] | null => { const s = norm(t).replace(/^[{[(]|[}\])]$/g, "").replace(/\b[a-z]\s*=\s*/gi, ""); const parts = s.split(/\s*(?:,|;|\band\b|\bor\b)\s*/i).filter(Boolean).map(rat); return parts.length && parts.every((p) => p !== null) ? [...new Set(parts as string[])].sort() : null; };

/** M2 judges a claim of a kind that depends on the task: an exact value, the solutions of an equation, or the sum of a convergent series */
const m2: TypedCapability<M2Problem, M2Result> = {
  id: "m2",
  candidates(p, t) {
    if (p.domain === "sequence-series" && p.task === "infinite-gp") { const e = m2Exact(t); return e ? [{ kind: "convergence", converges: true, sum: e }] : []; }
    if (p.domain === "sequence-series" && ["ap-term", "ap-sum", "gp-term", "gp-sum"].includes(p.task)) { const e = m2Exact(t); return e ? [{ kind: "exact", value: e }] : []; }
    if (p.domain === "trigonometry" && p.task === "value") { const e = m2Exact(t); return e ? [{ kind: "exact", value: e }] : []; }
    if (p.domain === "radical" && ["sqrt", "nth-root", "rationalize"].includes(p.task)) { const e = m2Exact(t); return e ? [{ kind: "exact", value: e }] : []; }
    if (p.domain === "exponential-log" && /equation$/.test(p.task)) { const v = listOf(t); return v ? [{ kind: "solutions", values: v }] : []; }
    return [];
  },
  check(p, v) {
    const a = assessM2Working(p, [{ kind: "claim", result: v }]);
    return a.classification === "verified" ? "verified" : a.classification === "invalid" ? "rejected" : "unsupported";
  },
};

type AnyCap = TypedCapability<any, any>;
export const TYPED_CAPABILITIES: Record<TypedObject["capability"], AnyCap> = { "linear-algebra": linearAlgebra, complex, "probability-statistics": probabilityStatistics, m2 };
export const typedCapability = (o: TypedObject): AnyCap => TYPED_CAPABILITIES[o.capability];
/** One verdict for a typed answer: "unread" (nothing to judge), the kernel's verdict, or "unsupported" when the kernel does not decide. A value that is readable and rejected is wrong; anything else never counts as wrong. */
export function judgeTyped(o: TypedObject, text: string): "unread" | TypedVerdict {
  const cap = typedCapability(o), vs = cap.candidates(o.problem, text);
  if (!vs.length) return "unread";
  const out = vs.map((v) => cap.check(o.problem, v));
  return out.includes("verified") ? "verified" : out.every((x) => x === "rejected") ? "rejected" : "unsupported";
}

/** the generator's numbers as the kernels' exact strings (rationals are written "n" or "n/d") */
const deepStr = (x: unknown): unknown => (typeof x === "number" ? String(x) : Array.isArray(x) ? x.map(deepStr) : x && typeof x === "object" ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, deepStr(v)])) : x);
/** a linear-algebra object from the generator's own data (numbers or strings; vectors and matrices as arrays) */
export const laObject = (area: LAProblem["area"], task: string, data: Record<string, unknown>, assumptions?: string[]): TypedObject =>
  ({ capability: "linear-algebra", problem: { domain: "linear-algebra", area, task, data: deepStr(data) as Record<string, unknown>, ...(assumptions ? { assumptions } : {}) } });
export const complexObject = (area: ComplexProblem["area"], task: string, data: Record<string, unknown>, assumptions?: string[]): TypedObject =>
  ({ capability: "complex", problem: { domain: "complex-polynomial", area, task, data: deepStr(data) as Record<string, unknown>, ...(assumptions ? { assumptions } : {}) } });
export const b1Object = (area: B1Problem["area"], task: string, data: Record<string, unknown>, assumptions?: B1Problem["assumptions"]): TypedObject =>
  ({ capability: "probability-statistics", problem: { domain: "probability-statistics", area, task, data: deepStr(data) as Record<string, unknown>, ...(assumptions ? { assumptions } : {}) } });
export const m2Object = (problem: M2Problem): TypedObject => ({ capability: "m2", problem });
/** every rational the object carries, in lowest terms ("1/5" for 2/10), except 0 and 1 */
export function objectValues(o: TypedObject): string[] {
  const out = new Set<string>();
  for (const m of JSON.stringify(o.problem).replace(/"(?:domain|area|task|fn|identity|law|unit|kind|relation|index)":"[^"]*"/g, "").matchAll(/-?\d+(?:\.\d+)?(?:\/-?\d+(?:\.\d+)?)?/g)) {
    const r = rat(m[0]);
    if (r !== null && !["0", "1", "-1"].includes(r)) out.add(r.replace(/^-/, ""));
  }
  return [...out];
}
/** the rationals a student is shown in a text: every number, fraction or decimal in it, and the integers inside them */
export function shownValues(text: string): Set<string> {
  const out = new Set<string>();
  for (const m of text.replace(/[−–]/g, "-").replace(/(\d),(?=\d)/g, "$1").matchAll(/\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)?|\d+/g)) {
    const r = rat(m[0]);
    if (r !== null) out.add(r);
    for (const d of m[0].match(/\d+/g) ?? []) { const q = rat(d); if (q !== null) out.add(q); }
  }
  return out;
}
