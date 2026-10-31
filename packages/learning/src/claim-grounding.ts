/**
 * E7 Phase 3: semantic grounding.
 *
 * A calculation can be true and still say nothing about the task. Grounding records WHY a verified claim is about the task: which task
 * premises, which earlier derived facts and which student-introduced assumptions it depends on. It lives in the existing structures:
 * `BindingEvidence.grounding` carries it, and `canonicalizeMathematicalObject` (the canonical IR, whose `dependencies` and `assumptions`
 * fields already exist) gives it a stable identity. Nothing here evaluates mathematics; kernels supply the sources.
 *
 * Provenance classes (never merged): task-premise, derived-fact (a value or symbol established by an earlier verified line),
 * student-assumption, free-literal (a number that is neither). Free literals are recorded, never promoted to evidence.
 */
import { canonicalizeMathematicalObject, type CanonicalMathematicalObject } from "./canonical-math-ir.ts";

export const GROUNDING_CONTRACT = "openpath-claim-grounding@1" as const;
export type SourceKind = "task-premise" | "derived-fact" | "student-assumption" | "free-literal";
export interface GroundingSource { /** set when the numeral is explained by a certified rewrite */ rule?: string; certificate?: string; kind: SourceKind; ref: string; by: "symbol" | "value"; /** explained by one arithmetic step from task premises, not a premise itself */ derived?: boolean; /** a value such as 0, 1, 2: it matches too many things to relate a claim to the task by itself */ trivial: boolean }
export interface Grounding { contract: typeof GROUNDING_CONTRACT; sources: GroundingSource[]; relevant: boolean; reason: string; /** false for a bare `label = value` answer statement, which is judged against the kernel's own value instead of being derived */ required?: boolean }

/**
 * Relevance of a derivation to the task. It is established by (a) a symbol bound to a task premise or to an earlier derived fact, or
 * (b) a non-trivial value that is exactly a task premise (up to sign) or exactly an earlier derived fact, or (c) at least two different
 * trivial values doing so. In every case NO non-trivial number may be left unexplained: a literal that comes from neither the premises (nor one arithmetic
 * step from two of them) nor an earlier derived fact is a free constant, and a calculation that depends on one is not shown to be about the task. A different method is never penalised: any route that starts from the premises or from something already
 * derived is relevant, whatever formula it uses.
 */
export function assessRelevance(sources: GroundingSource[]): Grounding {
  const linked = sources.filter((s) => s.kind !== "free-literal" && s.kind !== "student-assumption");
  const strong = linked.filter((s) => s.by === "symbol");
  const nontrivial = linked.filter((s) => s.by === "value" && !s.trivial && !s.derived); // a number explained by one step from two premises is explained, but it cannot by itself relate the calculation to the task
  const trivialDistinct = new Set(linked.filter((s) => s.by === "value" && s.trivial).map((s) => s.ref));
  const unexplained = sources.filter((s) => s.kind === "free-literal" && !s.trivial);
  const relevant = (strong.length > 0 || nontrivial.length > 0 || trivialDistinct.size >= 2) && unexplained.length === 0;
  const reason = linked.length && unexplained.length ? `the number${unexplained.length > 1 ? "s" : ""} ${[...new Set(unexplained.map((s) => s.ref))].slice(0, 4).join(", ")} come${unexplained.length > 1 ? "" : "s"} from neither the task data nor an earlier verified result`
    : relevant
    ? `grounded in ${[...new Set(linked.map((s) => `${s.kind}:${s.ref}`))].slice(0, 6).join(", ")}`
    : linked.length ? "only a single small value coincides with the task data, which does not relate the calculation to the task" : "no symbol or value of the calculation comes from the task premises or from an earlier derived fact";
  return { contract: GROUNDING_CONTRACT, sources, relevant, reason };
}

// ------------------------------------------------------------------------------------------------ E7 repair D: literal provenance
/**
 * THE rule by which a numeric line is tied to the task (shared by every route that grounds numbers: E5 geometry, E6 number chains, algebra lines).
 * Every numeric literal the line writes must be explained by the task or by the derivation, and nothing else explains it:
 *   (i) a task number; (ii) a number already established by an earlier accepted line; (iii) a constant licensed by the geometry/rule in force (180, 360, 90, and 2 only when the task supplies
 *   an equal-pair/bisector/isosceles premise); (iv) a RESULT: the value of a computation the line itself shows (35 + 75 = 110, A + B = 120 with A, B known), whose operands are themselves (i)-(iii).
 * Not explanations: the answer the task asks for, "being one arithmetic step from some two numbers of the task", or a small value. An operand that is none of (i)-(iv) is a free literal.
 */
export interface ProvenanceEnv { task: ReadonlySet<string>; established: ReadonlySet<string>; licensed: ReadonlySet<string>; named?: ReadonlyMap<string, number>; /** (v) what the immediately previous line/member computes with: see `previousClosure` */ previous?: ReadonlySet<string>; /** numerals introduced by a CERTIFIED registered rewrite of a visible expression (rewrite-registry.ts): numeral -> rule + certificate digest */ rewrite?: ReadonlyMap<string, { rule: string; digest: string }> }
const clean = (t: string): string => t.replace(/[−–—]/g, "-").replace(/[×·⋅]|\\cdot|\\times/g, "*").replace(/÷/g, "/").replace(/°|degrees?|\\circ|\^\{?\\circ\}?/gi, "").replace(/[$\\]/g, " ");
const numKey = (x: number): string => String(Math.round(x * 1e9) / 1e9);
/** a tiny exact-enough evaluator for the arithmetic a student writes (numbers, known names, + - * / ^ and parentheses); null when anything is not understood */
export function evalArithmetic(src: string, named?: ReadonlyMap<string, number>): number | null {
  const t = clean(src).match(/\d+(?:\.\d+)?|[A-Za-z]+|[()+\-*/^]|\S/g) ?? []; let i = 0;
  const peek = () => t[i];
  function primary(): number | null {
    const k = t[i++]; if (k === undefined) return null;
    if (/^\d/.test(k)) return Number(k);
    if (k === "(") { const v = sum(); if (t[i++] !== ")") return null; return v; }
    if (k === "-") { const v = primary(); return v === null ? null : -v; }
    if (/^[A-Za-z]+$/.test(k) && named?.has(k)) return named.get(k)!;
    return null;
  }
  function power(): number | null { let a = primary(); if (a === null) return null; while (peek() === "^") { i++; const b = primary(); if (b === null) return null; a = a ** b; } return a; }
  function prod(): number | null {
    let a = power(); if (a === null) return null;
    for (;;) {
      const nx = peek();
      if (nx === "*" || nx === "/") { const o = t[i++]; const b = power(); if (b === null) return null; if (o === "/" && b === 0) return null; a = o === "*" ? a * b : a / b; }
      else if (nx === "(" ) { const b = power(); if (b === null) return null; a *= b; } // implicit product: 2(3 + 1), (1/2)(2/3)
      else break;
    }
    return a;
  }
  function sum(): number | null { let a = prod(); if (a === null) return null; while (peek() === "+" || peek() === "-") { const o = t[i++]; const b = prod(); if (b === null) return null; a = o === "+" ? a + b : a - b; } return a; }
  const v = sum(); return v !== null && i === t.length && Number.isFinite(v) ? v : null;
}
// ------------------------------------------------------------------------------------------------ polynomial normal form (what expanding and collecting a line visibly produces)
type Poly = Map<string, number>;
const padd = (a: Poly, b: Poly, sg = 1): Poly => { const o: Poly = new Map(a); for (const [k, v] of b) o.set(k, (o.get(k) ?? 0) + sg * v); return o; };
const pmulMono = (x: string, y: string): string => { const m = new Map<string, number>(); for (const t of [x, y]) for (const f of t.split("*").filter(Boolean)) { const [v, e] = f.split("^"); m.set(v, (m.get(v) ?? 0) + Number(e ?? 1)); } return [...m].sort().map(([v, e]) => `${v}^${e}`).join("*"); };
const pmul = (a: Poly, b: Poly): Poly => { const o: Poly = new Map(); for (const [k1, v1] of a) for (const [k2, v2] of b) { const k = pmulMono(k1, k2); o.set(k, (o.get(k) ?? 0) + v1 * v2); } return o; };
/** the coefficients (and constant) of the expanded, collected form of a polynomial expression in letters; null when the text is not such an expression */
function polyMap(src: string): Poly | null {
  const t = clean(src).replace(/\s+/g, "").match(/\d+(?:\.\d+)?|[A-Za-z]|[()+\-*/^]/g); if (!t) return null; let i = 0;
  const peek = () => t[i];
  const num = (n: number): Poly => new Map([["", n]]);
  function atom(): Poly | null {
    const k = t![i++]; if (k === undefined) return null;
    if (/^\d/.test(k)) return num(Number(k));
    if (/^[A-Za-z]$/.test(k)) return new Map([[`${k}^1`, 1]]);
    if (k === "(") { const v = sum(); if (t![i++] !== ")") return null; return v; }
    if (k === "-") { const v = atom(); return v ? pmul(v, num(-1)) : null; }
    return null;
  }
  function pw(): Poly | null { let a = atom(); if (!a) return null; while (peek() === "^") { i++; const e = atom(); if (!e || e.size !== 1 || !e.has("")) return null; const n = e.get("")!; if (!Number.isInteger(n) || n < 0 || n > 6) return null; let r: Poly = num(1); for (let q = 0; q < n; q++) r = pmul(r, a); a = r; } return a; }
  function prod(): Poly | null {
    let a = pw(); if (!a) return null;
    for (;;) {
      const nx = peek();
      if (nx === "*") { i++; const b = pw(); if (!b) return null; a = pmul(a, b); }
      else if (nx === "/") { i++; const b = pw(); if (!b || b.size !== 1 || !b.has("") || b.get("") === 0) return null; a = pmul(a, num(1 / b.get("")!)); }
      else if (nx !== undefined && nx !== ")" && nx !== "+" && nx !== "-") { const b = pw(); if (!b) return null; a = pmul(a, b); } // implicit product: 2x, (x+1)(x-1)
      else break;
    }
    return a;
  }
  function sum(): Poly | null { let a = prod(); if (!a) return null; while (peek() === "+" || peek() === "-") { const o = t![i++]; const b = prod(); if (!b) return null; a = padd(a, b, o === "+" ? 1 : -1); } return a; }
  const p = sum(); if (!p || i !== t.length) return null;
  return p;
}
export function polyCoefficients(src: string): number[] | null { const p = polyMap(src); return p ? [...p.values()].filter((v) => Math.abs(v) > 1e-12).map(Math.abs) : null; }
/** canonical form of a line's polynomial content, sign-normalised: for `L = R` it is L − R, for an expression it is the expression. Two lines with the same key are the same polynomial statement rewritten (expanded, factored, collected, sides swapped). */
export function polynomialKey(src: string): string | null {
  const t = clean(src), sides = t.split(/=/).map((x) => x.trim()).filter(Boolean);
  const expr = sides.length === 2 ? `(${sides[0]}) - (${sides[1]})` : sides.length === 1 ? sides[0] : null; if (!expr || /[<>≤≥≠]/.test(t)) return null;
  const q = polyMap(expr); if (!q) return null;
  const entries = [...q].filter(([, v]) => Math.abs(v) > 1e-12).sort(([a], [b]) => (a < b ? -1 : 1)); if (!entries.length) return "0";
  const sg = entries[0][1] < 0 ? -1 : 1;
  return entries.map(([k, v]) => `${k}:${numKey(sg * v)}`).join("|");
}
/** the balanced parenthesised groups of a segment, innermost first (their values are visible sub-results of the line) */
function groupsOf(seg: string): string[] {
  const out: string[] = [], st: number[] = [];
  for (let k = 0; k < seg.length; k++) { if (seg[k] === "(") st.push(k); else if (seg[k] === ")" && st.length) { const a = st.pop()!; out.push(seg.slice(a + 1, k)); } }
  return out;
}
/**
 * (v) of the rule: what a step may compute with is what the line before it contains or directly computes. The numerals of the previous line, the values of its closed sub-computations
 * (5^2, 4*1*6) and one arithmetic operation (+ − × ÷) between two of those. This is deliberately narrower than "one step from any two numbers of the task": the number has to be
 * visible in, or one operation away from, the line it is derived from.
 */
export function previousClosure(texts: string | string[]): Set<string> {
  const out = new Set<string>(); const base = new Set<number>();
  for (const text of Array.isArray(texts) ? texts : [texts]) {
    const t = clean(text);
    for (const m of t.match(/(?<![A-Za-z])\d+(?:\.\d+)?/g) ?? []) { base.add(Number(m)); out.add(numKey(Number(m))); }
    // expanding and collecting a line visibly produces the coefficients of its sides and of their difference (−3(4 + 4m) − m = −13m − 12)
    const sides = t.split(/<=|>=|≤|≥|≠|!=|=|<|>/).map((x) => x.trim()).filter(Boolean);
    if (sides.length === 2) for (const c of [polyCoefficients(sides[0]), polyCoefficients(sides[1]), polyCoefficients(`(${sides[0]}) - (${sides[1]})`)]) for (const v of c ?? []) { base.add(v); out.add(numKey(v)); }
    const toks = (t.match(/\d+(?:\.\d+)?|[()+\-*/^]|[A-Za-z]+/g) ?? []).slice(0, 60);
    for (let i = 0; i < toks.length; i++) for (let j = i + 2; j <= toks.length; j++) {
      const w = toks.slice(i, j); if (w.some((x) => /^[A-Za-z]/.test(x))) break; if (!w.some((x) => /^[+\-*/^]$/.test(x))) continue;
      const v = evalArithmetic(w.join(" ")); if (v !== null) { base.add(v); out.add(numKey(v)); }
    }
  }
  const hadOne = (Array.isArray(texts) ? texts : [texts]).some((x) => /(?<![A-Za-z\d.])1(?![\d.])/.test(clean(x))); base.add(1); out.add("1"); // the implicit coefficient of a bare variable (3y = 2y + y)
  const ns = [...base].slice(-24);
  for (const a of ns) { out.add(numKey(a * a)); if (a >= 0 && Number.isInteger(Math.sqrt(a))) out.add(numKey(Math.sqrt(a))); for (const b of ns) { if (a === 1 && b === 1 && !hadOne) continue; /* the implicit coefficient does not combine with itself (1 + 1 = 2 is not written anywhere) */ out.add(numKey(a + b)); out.add(numKey(a - b)); out.add(numKey(a * b)); if (b !== 0) out.add(numKey(a / b)); } }
  return out;
}
/** `derivedOut` (optional) receives the values the line derives (sub-results and results), so a caller can establish them once the line is accepted */
const gcdN = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcdN(b, a % b));
function canonicalFraction(sg: string): boolean { const m = /^\(?\s*(-?\d+)\s*\)?\s*\/\s*\(?\s*(\d+)\s*\)?$/.exec(sg.trim()); return !!m && Number(m[2]) > 1 && gcdN(Number(m[1]), Number(m[2])) === 1; }
export function literalProvenance(text: string, env: ProvenanceEnv, derivedOut?: Set<string>): GroundingSource[] {
  // 'x = 3 or x = -3', 'a = 1, b = 2': each clause is a statement of its own
  const clauses = clean(text).split(/\s+(?:or|and)\s+|;|,(?![^()]*\))/i).map((x) => x.trim()).filter(Boolean);
  if (clauses.length > 1) { const seen = new Set<string>(); return clauses.flatMap((c) => literalProvenance(c, env, derivedOut)).filter((x) => { const k = `${x.kind}:${x.ref}`; if (seen.has(k)) return false; seen.add(k); return true; }); }
  return literalProvenanceOne(text, env, derivedOut);
}
function literalProvenanceOne(text: string, env: ProvenanceEnv, derivedOut?: Set<string>): GroundingSource[] {
  const segs = clean(text).split(/<=|>=|≤|≥|≠|!=|≈|=|<|>/).map((x) => x.trim()).filter(Boolean);
  const lits = (seg: string) => (seg.match(/(?<![A-Za-z])\d+(?:\.\d+)?/g) ?? []).map((x) => String(Number(x)));
  // a bare conclusion ("angle C = 70"): the claimed value is not a source of the derivation; the exact kernel judges it against the task, and the symbol ties it to the task
  if (segs.length === 2 && !/\d/.test(segs[0]) && /^-?\d+(?:\.\d+)?$/.test(segs[1])) return [];
  // a solved form whose value is irrational ("x = (5 + √21)/2"): the exact kernel certified the value as the solution; its radicand is a result of solving, not a fabricated numeral (a rational value could have been written as a numeral, so it gets no such exemption)
  if (segs.length === 2 && !/\d/.test(segs[0])) for (const m of segs[1].matchAll(/(?:sqrt|√)\s*(\d+(?:\.\d+)?|\([^()]*(?:\([^()]*\)[^()]*)*\))/g)) { const r = evalArithmetic(m[1].replace(/^\(|\)$/g, ""), env.named); if (r !== null && r > 0 && !Number.isInteger(Math.sqrt(r)) && Number.isInteger(r)) return []; }
  // (iii-b) the sum of the task's own named quantities is a licensed aggregate (the sum of the known angles in 180 − 110): sums of quantities the task states, never arbitrary differences or quotients of its numbers
  const sums = new Set<string>(); const nv = env.named ? [...env.named.values()].slice(0, 8) : [];
  for (let m = 3; m < (1 << nv.length); m++) { let c = 0, t = 0; for (let b = 0; b < nv.length; b++) if (m & (1 << b)) { c++; t += nv[b]; } if (c >= 2) sums.add(numKey(t)); }
  const base = (l: string) => env.task.has(l) || env.established.has(l) || env.licensed.has(l) || sums.has(l) || !!env.previous?.has(l);
  const vals = new Set<string>(); // values of computations the line shows, whose operands are already explained
  const explained = (l: string) => base(l) || vals.has(l);
  const ok: boolean[] = segs.map(() => false);
  for (let round = 0; round < 6; round++) {
    let changed = false;
    segs.forEach((sg, k) => {
      for (const g of groupsOf(sg)) { const lg = lits(g); const v = evalArithmetic(g, env.named); if (v !== null && lg.every(explained) && !vals.has(numKey(v))) { vals.add(numKey(v)); changed = true; } }
      if (ok[k]) return;
      const hasOp = /[\dA-Za-z)]\s*[+\-*/^]\s*[\dA-Za-z(]/.test(sg), v = evalArithmetic(sg, env.named);
      // a computation whose operands are all explained, or a restatement of a value the line already derived (6/4 = 3/2), is explained
      // a restatement of an explained value is explained only in its canonical form (a numeral, or a fraction in lowest terms): a fabricated expression that merely equals it (8 − 6, 100/300) is not
      const canonicalRestatement = v !== null && explained(numKey(v)) && (/^-?\d+(?:\.\d+)?$/.test(sg) || canonicalFraction(sg));
      if (v !== null && ((hasOp && lits(sg).every(explained)) || canonicalRestatement)) { ok[k] = true; if (!vals.has(numKey(v))) vals.add(numKey(v)); changed = true; }
    });
    if (!changed) break;
  }
  if (derivedOut) for (const v of vals) derivedOut.add(v);
  // (vi) a number applied to BOTH sides of a relation is the parameter of a balance operation (multiply/divide/add/subtract both sides by it); the result is checked by equivalence, not by this rule
  const balance = new Set<string>(); if (segs.length === 2) { const a = new Set(lits(segs[0])); for (const l of lits(segs[1])) if (a.has(l)) balance.add(l); }
  const out: GroundingSource[] = []; const seen = new Set<string>();
  segs.forEach((sg, k) => {
    for (const l of lits(sg)) {
      if (seen.has(l)) continue; const trivial = Math.abs(Number(l)) <= 2;
      if (env.licensed.has(l) && !env.task.has(l) && !env.established.has(l)) { seen.add(l); continue; }
      if (env.task.has(l)) out.push({ kind: "task-premise", ref: l, by: "value", trivial });
      else if (env.established.has(l)) out.push({ kind: "derived-fact", ref: l, by: "value", trivial });
      else if (balance.has(l)) out.push({ kind: "derived-fact", ref: l, by: "value", trivial: Math.abs(Number(l)) <= 2, derived: true });
      else if (env.previous?.has(l)) out.push({ kind: "derived-fact", ref: l, by: "value", trivial: Math.abs(Number(l)) <= 2, derived: true });
      else if (sums.has(l)) out.push({ kind: "derived-fact", ref: l, by: "value", trivial: false, derived: true });
      else if (ok[k] || vals.has(l)) out.push({ kind: "derived-fact", ref: l, by: "value", trivial: true, derived: true });
      else out.push({ kind: "free-literal", ref: l, by: "value", trivial: false });
      seen.add(l);
    }
  });
  return out;
}

/** The grounded claim in the canonical IR: dependencies are the premises/derived facts it rests on, assumptions are the student-introduced ones. */
export function groundingToCanonical(claim: string, g: Grounding, assumptions: string[], verified: boolean): CanonicalMathematicalObject {
  return canonicalizeMathematicalObject({
    mathematicalType: "grounded-claim", value: claim,
    dependencies: [...new Set(g.sources.filter((s) => s.kind === "task-premise" || s.kind === "derived-fact").map((s) => `${s.kind}:${s.ref}`))].sort(),
    assumptions: [...new Set([...assumptions, ...g.sources.filter((s) => s.kind === "student-assumption").map((s) => s.ref)])].sort(),
    verificationStatus: verified && g.relevant ? "verified" : verified ? "conditional" : "unverified",
    outstandingObligations: g.relevant ? [] : ["relevance to the task is not established"],
  });
}
