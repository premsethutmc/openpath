/**
 * Derivation authority (P2 contract; design: DERIVATION_CERTIFICATE_ARCHITECTURE_REPAIR.md).
 *
 * Two INDEPENDENT judgments are made about a line of working:
 *   1. VALIDITY      - is the claim mathematically true?  (exact arithmetic / the symbolic kernel; never decided here by authorization)
 *   2. AUTHORIZATION - is the claim a justified derivation FROM the visible expression, in THIS task?  Refused by default.
 * A false claim is `invalid`; a true claim that no registered, replayable justification explains is `unsupported`. Neither can make the other pass.
 *
 * There is NO "not applicable" outcome: an unparseable task, an unparseable line, a missing certificate, an expression outside the supported surface,
 * a source that is not visible, a domain condition without a carrier - all REFUSE (with a reason). Legacy numeral provenance can never grant.
 *
 * A certificate is bound to its task (digest), its source expression and path, its replacement, its rule, its assumptions and domain conditions, the
 * certificates it depends on, the kernel evidence and the registry/authority/kernel versions. `replayDerivationChain` re-validates all of it
 * independently in the ORIGINAL task context (it never searches and never trusts a field it can recompute).
 */
import { verifySymbolicTransformation, type SymbolicAssumption } from "./symbolic-equivalence.ts";
import { checkSymbolicCertificate, type KernelCertificate } from "./proof-kernel.ts";
import { sha256Hex } from "./digest.ts";
import { polynomialKey } from "./claim-grounding.ts";
import type { Expr } from "./calculus-core";
import { parseTree, certifyRewrite, replayRewriteCertificate, canon, show, isFrac, toExpr, sameUpToFractionRegrouping, REWRITE_REGISTRY_VERSION, type Tree, type RewriteCertificate } from "./rewrite-registry.ts";
import { approximatesAllRoots, compareStatements, fullDomain, pgcd, sameRational, provableSign, provablyNonzero, rationalSolutionSet, ratOf, showQ, variableOf, SOLUTION_SETS_VERSION, type Comparison, type Domain, type Rel, type Statement } from "./solution-sets.ts";

// @2 (Milestone 2): zero-product@1 / square-root@1 solution reading, solve-jump refusal, loses-solution@1 refutation; @1 certificates no longer replay as current
// @3 (grader generalization): solution-sets@1 validity (exact real solution sets, domain-aware), balance by any visible term / factor / denominator,
//     provably nonzero expressions, implication-only steps (multiplying by a possibly-zero expression, squaring) with candidate checking, inequalities,
//     substitution under task bindings, wider task-statement normalization; @2 certificates no longer replay as current
// @4 (D1 grader-teaching integration; rules unchanged from B2 aac35c6, only the label): B2 changed what authority@3 decides without a new label —
//     notation@2 ambiguity refusals (2^3x, x2, 1/(x+3)(x-2), 2 3x), the bounded balance+symmetry move (6 < 2x -> x > 3) and completeness@2 (lowest-terms
//     quotients). An @3 certificate therefore did not identify its rules (an @3 chain for "2^3x = 64" issued at be91d17 fails replay under B2 as if
//     tampered). @3 certificates are now reported as historical-version-not-replayable (their recorded result stands, unverified); they are never replayed as @4.
export const AUTHORITY_VERSION = "openpath-derivation-authority@4" as const;
export const DERIVATION_CERTIFICATE_VERSION = "openpath-derivation-certificate@3" as const;
export const KERNEL_VERSION = "openpath-symbolic-proof-kernel@1" as const;
export type Grade = "determined" | "anchored" | "parametric";

// ------------------------------------------------------------------------------------------------ exact arithmetic on trees
type R = { n: bigint; d: bigint };
const mk = (n: bigint, d: bigint): R => { if (d < 0n) { n = -n; d = -d; } let a = n < 0n ? -n : n, b = d; while (b) [a, b] = [b, a % b]; a ||= 1n; return { n: n / a, d: d / a }; };
const same = (a: R, b: R) => a.n === b.n && a.d === b.d;
export function evalTree(t: Tree): R | null {
  if (t.k === "n") return mk((t.v as any).n, (t.v as any).d);
  if (t.k === "v") return null;
  const a = evalTree(t.l), b = evalTree(t.r); if (!a || !b) return null;
  if (t.op === "+") return mk(a.n * b.d + b.n * a.d, a.d * b.d);
  if (t.op === "-") return mk(a.n * b.d - b.n * a.d, a.d * b.d);
  if (t.op === "*") return mk(a.n * b.n, a.d * b.d);
  if (t.op === "/") return b.n === 0n ? null : mk(a.n * b.d, a.d * b.n);
  if (b.d !== 1n || b.n < 0n || b.n > 12n) return null;
  return mk(a.n ** b.n, a.d ** b.n);
}
const hasVar = (t: Tree): boolean => t.k === "v" || (t.k === "b" && (hasVar(t.l) || hasVar(t.r)));
const isAtomT = (t: Tree) => (t.k === "n" && !t.u) || isFrac(t);
const isNegAtom = (t: Tree) => t.k === "b" && t.op === "-" && t.l.k === "n" && !!t.l.u && isAtomT(t.r);
const isId = (t: Tree, v: bigint) => t.k === "n" && !t.u && (t.v as any).n === v && (t.v as any).d === 1n;
const neutral = (t: Tree): boolean => t.k === "b" && (neutral(t.l) || neutral(t.r) || (t.op === "*" && (isId(t.l, 1n) || isId(t.r, 1n))) || (t.op === "+" && (isId(t.l, 0n) || isId(t.r, 0n))) || (t.op === "-" && isId(t.r, 0n) && !(t.l.k === "n" && t.l.u)) || (t.op === "/" && isId(t.r, 1n)) || (t.op === "^" && isId(t.r, 1n)));
const SUP: Record<string, string> = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9" };
/** notation normalization only (no meaning added): unicode minus / times / divide, square brackets as parentheses, superscript exponents, ≤ ≥ */
const strip = (s: string) => s.replace(/[−–—]/g, "-").replace(/[×·⋅]/g, "*").replace(/÷/g, "/").replace(/\[/g, "(").replace(/\]/g, ")").replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (m) => "^" + [...m].map((c) => SUP[c]).join("")).replace(/<=/g, "≤").replace(/>=/g, "≥");
const tz = (r: R | null) => { if (!r || r.d !== 1n || r.n === 0n) return 0; let k = 0, x = r.n < 0n ? -r.n : r.n; while (x % 10n === 0n) { x /= 10n; k++; } return k; };
const gcd = (a: bigint, b: bigint) => { a = a < 0n ? -a : a; while (b) [a, b] = [b, a % b]; return a || 1n; };
const terms = (t: Tree, s = 1n): R[] => t.k === "b" && (t.op === "+" || t.op === "-") ? [...terms(t.l, s), ...terms(t.r, t.op === "+" ? s : -s)] : (() => { const v = evalTree(t); return v ? [mk(s * v.n, v.d)] : []; })();
const numeralKeys = (t: Tree): string[] => t.k === "n" ? (t.u ? [] : [`${mk((t.v as any).n, (t.v as any).d).n < 0n ? -mk((t.v as any).n, (t.v as any).d).n : mk((t.v as any).n, (t.v as any).d).n}/${mk((t.v as any).n, (t.v as any).d).d}`]) : t.k === "v" ? [] : [...numeralKeys(t.l), ...numeralKeys(t.r)];
const denomsOf = (t: Tree): bigint[] => isFrac(t) ? [(t as any).r.v.n] : t.k === "b" ? [...denomsOf(t.l), ...denomsOf(t.r)] : [];
const pt = (s: string): { t: Tree; sg: 1 | -1 } | null => { const neg = s.startsWith("~("); const t = parseTree(neg ? s.slice(2, -1) : s); return t && { t, sg: neg ? -1 : 1 }; };

// ------------------------------------------------------------------------------------------------ task identity
export interface TaskContext {
  statement: string; sides: string[]; trees: Tree[]; conditions: string[]; assumptions: SymbolicAssumption[]; numerals: ReadonlySet<string>; denominators: bigint[];
  mode: "expression" | "equation" | "inequality"; digest: string;
  /** inequality tasks: the relation between the two sides */
  rel?: Rel;
  /** substitution tasks ("Given x = 3, ...", "... when x = 4"): established values of variables, and the name the expression defines ("find y where y = ...") */
  bindings?: Record<string, string>; defined?: string | null;
  /** the domain of the derivation (solution-sets@1): declared conditions, and every variable denominator of the task nonzero (the task is undefined there) */
  domain?: Domain | null; natural?: string[];
}
export type TaskResult = { ok: true; task: TaskContext } | { ok: false; reason: string; /** notation@2: the task text has more than one reading (structured, so a caller can say "ambiguous" rather than "unsupported") */ ambiguous?: boolean };
const VERB = /^(?:expand and simplify|simplify fully|factori[sz]e fully|compute|evaluate|work out|find the value of|calculate|solve(?: for [a-z])?|find [a-z]|simplify|expand|factori[sz]e|factor|reduce|what is)\s*:?\s+/i;
const V = (name: string): Expr => ({ kind: "variable", name } as Expr);
function parseCondition(c: string): { text: string; a: SymbolicAssumption; v: string; rel: string; k: string } | null {
  const m = /^\s*([A-Za-z])\s*(?:(≠|!=|=\/=)\s*(-?\d+(?:\.\d+)?)|(>|≥|>=|<|≤|<=)\s*(-?\d+(?:\.\d+)?))\s*$/.exec(c.replace(/\bnot equal to\b/i, "≠"));
  if (!m) return null;
  const x = V(m[1]);
  const shifted = (k: string, sign: 1 | -1): Expr => { const kk = Number(k); const base = sign > 0 ? x : ({ kind: "multiply", factors: [{ kind: "constant", value: "-1" }, x] } as Expr); return kk === 0 ? base : ({ kind: "add", terms: [base, { kind: "constant", value: String(sign > 0 ? -kk : kk) }] } as Expr); };
  if (m[2]) return { text: c.trim(), a: { kind: "nonzero", expression: shifted(m[3], 1) }, v: m[1], rel: "≠", k: m[3] };
  const r = m[4].replace(">=", "≥").replace("<=", "≤");
  // x > k: x - k positive; x ≥ k: x - k nonnegative; x < k: k - x positive; x ≤ k: k - x nonnegative (the zero-k forms keep their earlier spelling)
  const a: SymbolicAssumption = { kind: r === ">" || r === "<" ? "positive" : "nonnegative", expression: shifted(m[5], r === ">" || r === "≥" ? 1 : -1) };
  return { text: c.trim(), a, v: m[1], rel: r, k: m[5] };
}
const qOfDecimal = (k: string) => { const [i, f = ""] = k.replace(/^-/, "").split("."); const n = BigInt(i + f) * (k.startsWith("-") ? -1n : 1n); return { n, d: 10n ** BigInt(f.length) }; };
/** the derivation domain from the declared conditions on the task's single variable (null when the task has several variables) */
function domainOf(v: string, conds: { v: string; rel: string; k: string }[], natural: Tree[]): Domain {
  const d = fullDomain(v);
  for (const c of conds) { if (c.v !== v) continue; const at = (() => { const r = qOfDecimal(c.k); const g0 = gcd(r.n, r.d); return { n: r.n / g0, d: r.d / g0 }; })();
    if (c.rel === "≠") d.excluded.push(at); else if (c.rel === ">" || c.rel === "≥") d.lower = { at, strict: c.rel === ">" }; else d.upper = { at, strict: c.rel === "<" }; }
  for (const t of natural) { const r = ratOf(t, v); if (r) d.nonzero.push(r.f.num); }
  return d;
}
/** variable denominators of a tree (the task is undefined where one is zero) */
const varDenominators = (t: Tree): Tree[] => t.k !== "b" ? [] : [...varDenominators(t.l), ...varDenominators(t.r), ...(t.op === "/" && hasVar(t.r) ? [t.r] : [])];
/**
 * notation@1: a division whose right operand is followed by an implicit product (1/2x, 3/4(x + 1), x/2x) or two divisions chained in one product
 * (x/2/4) has two readings. Such text is never read (refused as unrecognized), so neither reading can be certified.
 */
export function ambiguousNotation(text: string): boolean {
  const clauses = strip(text).split(/\s+(?:or|and)\s+|[,;]/i);
  if (clauses.length > 1) return clauses.some((c) => ambiguousNotation(c));
  if (/(?:\d|(?<![A-Za-z])[A-Za-z])\s+\d/.test(clauses[0].trim())) return true;                           // notation@2: 2 3, x 2: a missing operator between a term and a numeral (23? 2·3? x·2? x^2?)
  const t = clauses[0].replace(/\s+/g, "");
  if (/\/(?:\d+(?:\.\d+)?|[A-Za-z])(?=[A-Za-z(])/.test(t)) return true;                                   // a/b x, a/b(…)
  if (groupedDivisorThenFactor(t)) return true;                                                           // notation@2: 1/(x+3)(x-2): 1/((x+3)(x-2)) or (x-2)/(x+3)
  if (/\^(?:-?[\dA-Za-z.]+|\([^()]*\))\^/.test(t)) return true;                                           // notation@2: 2^3^2: (2^3)^2 or 2^(3^2)
  if (/\^-?\d+(?:\.\d+)?[A-Za-z]/.test(t)) return true;                                                  // notation@2: x^2x, 2^3x: exponent scope (x^(2x) or x^2·x)
  if (/(?<![A-Za-z])[A-Za-z]\d/.test(t)) return true;                                                     // notation@2: x2 is neither 2x nor x^2
  if (/(?<![A-Za-z)\d.])\d+(?:\.\d+)?\^-?\d+(?:\.\d+)?\/\d/.test(t)) return true;                         // 9^1/2: (9^1)/2 or 9^(1/2)
  if (/\/(?:[^+\-*/=<>()≤≥]+|\([^()]*\))\//.test(t)) return true;                                          // a/b/c: (a/b)/c or a/(b/c)
  return false;
}
/** a parenthesised divisor directly followed by an implicit factor: `/(…)(…)`, `/(…)x`, `/(…)2` */
function groupedDivisorThenFactor(t: string): boolean {
  for (let k = t.indexOf("/("); k >= 0; k = t.indexOf("/(", k + 1)) {
    let i = k + 2, d = 1; while (i < t.length && d) { d += t[i] === "(" ? 1 : t[i] === ")" ? -1 : 0; i++; }
    if (d === 0 && i < t.length && /[A-Za-z0-9(]/.test(t[i])) return true;
  }
  return false;
}
/** the ONLY wrapper handling. Everything else fails closed with a reason. Declared conditions become carried assumptions; an unparseable condition refuses the task. */
export function normalizeTask(statement: string, extraNumerals: readonly string[] = []): TaskResult {
  let s = strip(String(statement ?? "")).trim().replace(/[.?]+$/, "").trim();
  // substitution tasks: established values ("Given x = 3 and y = 2, ...", "... when x = 4") and a defined name ("find y where y = 5x + 10")
  const bindings: Record<string, string> = {}; let defined: string | null = null;
  const bindList = (txt: string): boolean => { for (const part of txt.split(/\s*(?:,|\band\b)\s*/i).filter(Boolean)) { const b = /^([A-Za-z])\s*=\s*(-?\d+(?:\.\d+)?(?:\/\d+)?)$/.exec(part.trim()); if (!b || b[1] in bindings) return false; bindings[b[1]] = b[2]; } return true; };
  const given = /^given\s+(.+?),\s*(.+)$/i.exec(s); if (given) { if (!bindList(given[1])) return { ok: false, reason: "task-unparsed" }; s = given[2].trim(); }
  const when = /^(.*\S)\s+(?:when|if|for)\s+([A-Za-z]\s*=\s*-?[\d./]+(?:\s*(?:,|and)\s*[A-Za-z]\s*=\s*-?[\d./]+)*)$/i.exec(s); if (when) { if (!bindList(when[2])) return { ok: false, reason: "task-unparsed" }; s = when[1].trim(); }
  const def = /^find\s+([A-Za-z])\s+(?:where|if|when)\s+\1\s*=\s*(.+)$/i.exec(s); if (def) { defined = def[1]; s = def[2].trim(); }
  const conds: string[] = [];
  const m = /\s*(?:,|\bfor\b|\bwhere\b|\bassuming\b|\bwith\b)\s+([A-Za-z]\s*(?:≠|!=|≥|>|≤|<)[^,]*?(?:(?:,|\s+and)\s*[A-Za-z]\s*(?:≠|!=|≥|>|≤|<)[^,]*?)*)$/i.exec(s);
  if (m) { conds.push(...m[1].split(/,|\s+and\s+/i)); s = s.slice(0, m.index); }
  s = s.replace(VERB, "").trim().replace(/=\s*$/, "").trim();
  if (ambiguousNotation(s)) return { ok: false, reason: "task-unparsed", ambiguous: true };
  const parsed = conds.map(parseCondition); if (parsed.some((p) => !p)) return { ok: false, reason: "task-condition-unparsed" };
  if (/[A-Za-z]{3,}|\b(?:ln|pi|or|if)\b|[A-Za-z]+\s+[A-Za-z]+/i.test(s)) return { ok: false, reason: "task-unparsed" };   // words are not algebra: "a thing happened" must not parse as a product of letters
  // an inequality task: exactly one relation, no "="
  const relM = /(≤|≥|<|>)/.exec(s); let rel: Rel | undefined;
  if (relM) { if (/=/.test(s) || (s.match(/[≤≥<>]/g) ?? []).length !== 1) return { ok: false, reason: "task-unparsed" }; rel = ({ "≤": "<=", "≥": ">=", "<": "<", ">": ">" } as const)[relM[1] as "≤"]; }
  const sides = (relM ? s.split(relM[1]) : s.split("=")).map((x) => x.trim()); if (!s || sides.length > 2 || sides.some((x) => !x)) return { ok: false, reason: "task-unparsed" };
  const trees = sides.map((x) => parseTree(x)); if (trees.some((t) => !t)) return { ok: false, reason: "task-unparsed" };
  const T = trees as Tree[]; const mode = relM && T.some(hasVar) ? "inequality" : sides.length === 2 && !relM && T.some(hasVar) ? "equation" : sides.length === 1 ? "expression" : null;
  if (!mode) return { ok: false, reason: "task-unparsed" };
  if (Object.keys(bindings).length && mode !== "expression") return { ok: false, reason: "task-unparsed" };
  const P = parsed as NonNullable<ReturnType<typeof parseCondition>>[];
  const conditions = P.map((p) => p.text), assumptions = P.map((p) => p.a);
  // the natural domain of an equation / inequality: every variable denominator of the task is nonzero (the statement is undefined there)
  const natural: Tree[] = mode === "expression" ? [] : T.flatMap(varDenominators);
  const naturalText: string[] = [];
  for (const dn of natural) { const ex = toExpr(dn); if (!ex) return { ok: false, reason: "task-unparsed" }; const a: SymbolicAssumption = { kind: "nonzero", expression: ex }; if (!assumptions.some((h) => covered(a, [h]))) { assumptions.push(a); naturalText.push(`${show(dn)} ≠ 0`); } }
  const v = mode === "expression" ? null : variableOf(T);
  const domain = v ? domainOf(v, P, natural) : null;
  const body = { v: AUTHORITY_VERSION, sides: T.map(canon), conditions, rel: rel ?? null, bindings, defined, natural: naturalText, extra: [...extraNumerals].sort() };
  const bindNumerals = Object.values(bindings).flatMap((x) => { const t = parseTree(x); return t ? numeralKeys(t) : []; });
  return { ok: true, task: { statement, sides: T.map((t) => show(t)), trees: T, conditions, assumptions, numerals: new Set([...T.flatMap(numeralKeys), ...bindNumerals, ...extraNumerals.flatMap((x) => { const t = parseTree(String(x)); return t ? numeralKeys(t) : []; })]), denominators: T.flatMap(denomsOf), mode, digest: sha256Hex(JSON.stringify(body)), rel, bindings, defined, domain, natural: naturalText } };
}

// ------------------------------------------------------------------------------------------------ grading (P2): determined / anchored / parametric
interface GCtx { siblings: R[]; numerals: ReadonlySet<string>; denominators: bigint[] }
function pvParts(r: R): R[] | null {
  let m = 0, v = r; while (v.d !== 1n && m < 6) { v = mk(v.n * 10n, v.d); m++; } if (v.d !== 1n) return null;
  const neg = v.n < 0n, s = (neg ? -v.n : v.n).toString(), out: R[] = [];
  for (let i = 0; i < s.length; i++) { const dg = BigInt(s[i]); if (dg === 0n) continue; const e = s.length - 1 - i - m; const sg = neg ? -1n : 1n; out.push(e >= 0 ? mk(dg * 10n ** BigInt(e) * sg, 1n) : mk(dg * sg, 10n ** BigInt(-e))); }
  return out;
}
function groupedPV(src: R, parts: R[]): boolean {
  const pv = pvParts(src); if (!pv || pv.length > 8 || parts.length > pv.length) return false; const tot = parts.map(() => mk(0n, 1n));
  const go = (i: number): boolean => { if (i === pv.length) return parts.every((p, j) => same(p, tot[j])); for (let j = 0; j < parts.length; j++) { const old = tot[j]; tot[j] = mk(old.n * pv[i].d + pv[i].n * old.d, old.d * pv[i].d); if (go(i + 1)) return true; tot[j] = old; } return false; };
  return go(0);
}
/** p/q written as its p unit fractions 1/q (3/4 = 1/4 + 1/4 + 1/4). An arbitrary split of the numerator (5/9 = 1/9 + 4/9) has a free parameter and is NOT determined. */
function groupedUnits(src: Tree, parts: Tree[]): boolean {
  if (!isFrac(src) || parts.length < 2) return false; const q = (src as any).r.v.n as bigint, p = (src as any).l.v.n as bigint; if ((src as any).l.v.d !== 1n || p < 0n) return false;
  let tot = 0n; for (const t of parts) { if (!isFrac(t)) return false; const f = t as any; if (f.r.v.n !== q || f.l.v.d !== 1n || f.l.v.n !== 1n) return false; tot += f.l.v.n; } return tot === p;
}
const sv = (x: { t: Tree; sg: 1 | -1 }) => { const v = evalTree(x.t); return v && x.sg < 0 ? mk(-v.n, v.d) : v; };
export function gradeStep(s: { rule: string; source: string[]; replacement: string[] }, cx: GCtx): Grade {
  const src = s.source.map(pt), rep = s.replacement.map(pt); if (src.some((x) => !x) || rep.some((x) => !x)) return "parametric";
  const S = src as { t: Tree; sg: 1 | -1 }[], Rp = rep as { t: Tree; sg: 1 | -1 }[];
  if (["evaluate", "evaluate-product", "distribute", "distribute-unevaluated", "fraction-multiply", "fraction-divide", "fraction-combine", "fraction-chain", "fraction-regroup", "sign-product", "distribute-split", "factor-common", "difference-of-squares"].includes(s.rule)) return "determined";
  const taskOrigin = (x: { t: Tree; sg: 1 | -1 }) => { const v = sv(x); return !!v && cx.numerals.has(`${v.n < 0n ? -v.n : v.n}/${v.d}`); };
  if (s.rule === "split-additive") {
    const v = sv(S[0]), ps = Rp.map(sv); if (v && ps.every((p) => p) && groupedPV(v, ps as R[])) return "determined";
    if (v && ps.every((p) => p) && groupedUnits(S[0].t, Rp.map((x) => x.t))) return "determined";                  // 3/4 = 1/4 + 2/4: a grouping of the unit fractions that make the numeral
    if (!taskOrigin(S[0]) || !v) return "parametric";
    const partition = ps.every((p) => p && (p.n < 0n) === (v.n < 0n) && (p.n < 0n ? -p.n : p.n) * v.d < (v.n < 0n ? -v.n : v.n) * p.d);   // a real PARTITION of the source: same sign, each piece smaller (not 32 = 109 + (-77))
    { const abs = (r: R) => (r.n < 0n ? mk(-r.n, r.d) : r), sibs = [...cx.siblings]; const k = sibs.findIndex((q) => same(abs(q), abs(v))); if (k >= 0) sibs.splice(k, 1);
      if (!partition && (ps as R[]).some((p) => sibs.some((q) => same(abs(p), abs(q))))) return "parametric"; }   // a piece that IS another term of the line rebuilds the term from its neighbour (29 - 28 = 29 - (29 - 1)): circular
    const sib = (p: R) => cx.siblings.some((q) => { const t = mk(p.n * q.d + q.n * p.d, p.d * q.d); if (t.n === 0n) return partition;                                                                         // cancelling a sibling (77 + 32 = 77 + (109 - 77)): only a true partition
      const ap = p.n < 0n ? -p.n : p.n, lim = 10n ** BigInt(tz(t));                                           // the compensation is the distance to the round target (86 + 4 = 90), never an arbitrary number (86 + 104 = 190)
      return ap < lim * p.d && (tz(t) > Math.max(tz(p), tz(q)) || (tz(t) >= 1 && tz(p) === 0 && tz(q) === 0)); });   // NOT "cancels a sibling": 77 + 32 = 77 + (109 - 77) re-expresses the answer (found by the held-out corpus)
    return Rp.some((x) => { const p = sv(x); if (!p || tz(p) < 1 || tz(p) <= tz(v)) return false; const dn = p.n * v.d - v.n * p.d, ad = dn < 0n ? -dn : dn; return ad < 10n ** BigInt(tz(p)) * p.d * v.d; }) ||   // a ROUND piece must be the round neighbour of the source (37 = 40 - 3), not any round number
       (ps as R[]).some(sib) ? "anchored" : "parametric";
  }
  if (s.rule === "split-multiplicative") { if (!taskOrigin(S[0])) return "parametric"; const ps = Rp.map(sv) as R[]; return ps.some((p, i) => ps.some((q, j) => i !== j && p && q && tz(mk(p.n * q.n, p.d * q.d)) > Math.max(tz(p), tz(q)))) ? "anchored" : "parametric"; }
  if (s.rule === "fraction-scale") {
    const b = Rp[0].t as any; if (!isFrac(b)) return "parametric";
    if (gcd(b.l.v.n, b.r.v.n) === 1n) return "determined";                                       // reduction to lowest terms
    const den = b.r.v.n as bigint, lcm = cx.denominators.reduce((a, d) => (a * d) / gcd(a, d), 1n);
    return cx.denominators.includes(den) || den === lcm ? "determined" : "parametric";           // scaling to a visible denominator or the common denominator
  }
  if (s.rule === "shifted-transfer") { const o = S.map(sv) as R[]; return Rp.some((x) => { const v = sv(x); return v && o.some((q) => !same(q, v) && tz(v) > tz(q) && tz(v) >= 1); }) ? "anchored" : "parametric"; }
  return "parametric";
}

// ------------------------------------------------------------------------------------------------ polynomial normal / factored forms (symbolic authorization)
const addFlat = (t: Tree, sg = 1): { n: Tree; s: number }[] => t.k === "b" && (t.op === "+" || t.op === "-") ? [...addFlat(t.l, sg), ...addFlat(t.r, t.op === "+" ? sg : -sg)] : t.k === "n" && t.u ? [] : [{ n: t, s: sg }];
const mulFlat = (t: Tree): Tree[] => t.k === "b" && t.op === "*" ? [...mulFlat(t.l), ...mulFlat(t.r)] : [t];
function monomial(t: Tree): string | null {                       // variable part of a monomial, or null when t is not a monomial
  if (t.k === "n") return t.u ? null : "";
  if (t.k === "v") return t.name;
  if (t.k === "b" && t.op === "^") return t.l.k === "v" ? `${t.l.name}^${evalTree(t.r)?.n}` : null;
  if (t.k === "b" && t.op === "-" && t.l.k === "n" && t.l.u) return monomial(t.r);
  if (t.k === "b" && t.op === "*") { const fs = mulFlat(t); const nums = fs.filter((f) => !hasVar(f)); if (nums.length > 1) return null; const vs = fs.filter(hasVar).map(monomial); return vs.some((x) => x === null) ? null : vs.sort().join("*"); }
  if (t.k === "b" && t.op === "/" && !hasVar(t.r)) return isAtomT(t.r) ? monomial(t.l) : null;
  return null;
}
/** fully expanded AND collected polynomial: monomial terms, no like terms, no pure-number computation */
export function isExpandedCollected(t: Tree): boolean {
  const ts = addFlat(t); const ms = ts.map((x) => monomial(x.n)); if (ms.some((m) => m === null)) return false;
  if (new Set(ms).size !== ms.length) return false;
  return ts.filter((x) => !hasVar(x.n)).length <= 1;
}
const isFactored = (t: Tree): boolean => { const fs = mulFlat(t); return fs.length >= 2 && fs.filter((f) => f.k === "b" && (f.op === "+" || f.op === "-") && hasVar(f)).length >= 1 && fs.every((f) => !hasVar(f) || isExpandedCollected(f) || (f.k === "b" && f.op === "^" && isExpandedCollected(f.l))); };
/** completeness@2 (final form only, never validity): a quotient N/D of single-variable polynomials, each written expanded-and-collected or factored, in lowest terms
 *  (gcd(N, D) is a constant over Q; a numeric D shares no factor with N's integer coefficients): (x - 3)/(x + 3), (x + 3)/2, 1/(x - 1)^2. */
function lowestTermsQuotient(t: Tree): boolean {
  if (t.k !== "b" || t.op !== "/") return false;
  const shaped = (x: Tree) => !hasVar(x) ? isAtomT(x) || isNegAtom(x) : isExpandedCollected(x) || isFactored(x) || (x.k === "b" && x.op === "^" && x.r.k === "n" && isExpandedCollected(x.l));
  if (!shaped(t.l) || !shaped(t.r) || !hasVar(t)) return false;
  const v = variableOf([t]); if (!v) return false;
  const N = ratOf(t.l, v)?.f, D = ratOf(t.r, v)?.f; if (!N || !D || N.den.length !== 1 || D.den.length !== 1) return false;
  if (D.num.length === 1) {                                                   // numeric divisor: (x + 3)/2 is final, (2x + 6)/2 is not
    if (!N.num.every((c) => c.d === 1n) || D.num[0].d !== 1n || D.num[0].n === 0n) return false;
    const g = N.num.reduce((a, c) => gcd(a, c.n < 0n ? -c.n : c.n), D.num[0].n < 0n ? -D.num[0].n : D.num[0].n);
    return g === 1n;
  }
  return pgcd(N.num, D.num).length === 1;
}
const polyShape = (t: Tree): boolean => isExpandedCollected(t) || isFactored(t) || (t.k === "b" && t.op === "/" && polyShape(t.l) && polyShape(t.r)) || (t.k === "b" && t.op === "^" && t.l.k === "b" && isExpandedCollected(t.l));

// ------------------------------------------------------------------------------------------------ assumptions (carried, never invented)
const aKey = (a: SymbolicAssumption) => `${a.kind}:${JSON.stringify(a.expression)}`;
/** an assumption is covered by a declared one of the same expression that is at least as strong (positive => nonzero, nonnegative-of-positive) */
/** constants folded (-1*3 = -3, 2+(-5) = -3), sums and products order-free: the kernel and the statement may spell the same condition differently */
const qOf = (v: string): R | null => { const m = /^(-?\d+)(?:\/(\d+))?$/.exec(v); return m ? mk(BigInt(m[1]), BigInt(m[2] ?? "1")) : null; };
const qStr = (r: R) => (r.d === 1n ? `${r.n}` : `${r.n}/${r.d}`);
function fold(e: any): any {
  if (!e || typeof e !== "object") return e;
  if (e.kind === "add") { let c = mk(0n, 1n); const rest: any[] = []; for (const t of e.terms.map(fold)) { if (t.kind === "constant" && qOf(t.value)) { const q = qOf(t.value)!; c = mk(c.n * q.d + q.n * c.d, c.d * q.d); } else if (t.kind === "add") rest.push(...t.terms); else rest.push(t); } if (c.n !== 0n) rest.push({ kind: "constant", value: qStr(c) }); return rest.length === 1 ? rest[0] : { kind: "add", terms: rest }; }
  if (e.kind === "multiply") { let c = mk(1n, 1n); const rest: any[] = []; for (const t of e.factors.map(fold)) { if (t.kind === "constant" && qOf(t.value)) { const q = qOf(t.value)!; c = mk(c.n * q.n, c.d * q.d); } else if (t.kind === "multiply") rest.push(...t.factors); else rest.push(t); } if (c.n === 0n) return { kind: "constant", value: "0" }; if (!(c.n === 1n && c.d === 1n)) rest.unshift({ kind: "constant", value: qStr(c) }); return rest.length === 0 ? { kind: "constant", value: "1" } : rest.length === 1 ? rest[0] : { kind: "multiply", factors: rest }; }
  const o: any = {}; for (const k of Object.keys(e)) o[k] = Array.isArray(e[k]) ? e[k].map(fold) : fold(e[k]); return o;
}
const exprKey = (e0: any): string => { const e = fold(e0); const f = (x: any): string => x && typeof x === "object" ? (Array.isArray(x) ? "[" + x.map(f).join(",") + "]" : "{" + Object.keys(x).sort().map((k) => k + ":" + ((x.kind === "add" || x.kind === "multiply") && (k === "terms" || k === "factors") ? "[" + (x[k] as any[]).map(f).sort().join(",") + "]" : f(x[k]))).join(",") + "}") : String(x); return f(e); };
export function covered(need: SymbolicAssumption, have: readonly SymbolicAssumption[]): boolean {
  const e = exprKey(need.expression);
  const ex = fold(need.expression);
  if (ex && ex.kind === "multiply" && (need.kind === "positive" || need.kind === "nonzero" || need.kind === "nonnegative") && ex.factors.every((f: any) => f.kind === "constant" ? (() => { const q = qOf(f.value); return !!q && (need.kind === "nonzero" ? q.n !== 0n : need.kind === "positive" ? q.n > 0n : q.n >= 0n); })() : covered({ kind: need.kind, expression: f }, have))) return true;   // a product is positive / nonzero / nonnegative when every factor is
  return have.some((h) => exprKey(h.expression) === e && (h.kind === need.kind || (h.kind === "positive" && (need.kind === "nonzero" || need.kind === "nonnegative" || need.kind === "real")) || (need.kind === "real")));
}
/** re-check a kernel certificate; restrictions the kernel needs carried are accepted ONLY when the task declared them (covered), never invented */
function kernelCheck(c: KernelCertificate, before: Expr, after: Expr, used: readonly SymbolicAssumption[], declared: readonly SymbolicAssumption[]): boolean {
  const r = checkSymbolicCertificate(c, before, after, used as any, c.restrictions);
  if (r.outcome === "verified") return true;
  if (r.outcome !== "unsupported" || !r.obligations.length) return false;
  const need: SymbolicAssumption[] = []; for (const o of r.obligations) { const m = /^nonzero:(.*)$/.exec(o); if (!m) return false; try { need.push({ kind: "nonzero", expression: JSON.parse(m[1]) }); } catch { return false; } }
  if (need.some((a) => !covered(a, declared))) return false;
  return checkSymbolicCertificate(c, before, after, used as any, [...c.restrictions, ...r.obligations]).outcome === "verified";
}
export interface SymbolicStepVerdict { ok: boolean; reason: string; used: SymbolicAssumption[]; missing: SymbolicAssumption[]; certificate: KernelCertificate | null; outcome: string }
/**
 * Kernel-checked symbolic step with assumption tracking. `equivalent` passes only when no domain restriction is lost; `conditional` passes only when EVERY required assumption
 * is declared by the task (covered) - a missing assumption never becomes established. The assumptions used are returned for the certificate.
 */
export function checkSymbolicStep(before: Expr | null, after: Expr | null, declared: readonly SymbolicAssumption[]): SymbolicStepVerdict {
  const no = (reason: string, outcome = "inconclusive", missing: SymbolicAssumption[] = []): SymbolicStepVerdict => ({ ok: false, reason, used: [], missing, certificate: null, outcome });
  if (!before || !after) return no("expression-outside-supported-surface");
  const ev = verifySymbolicTransformation(before, after, [], { purpose: "algebra" });
  if (ev.outcome === "invalid") return no("mathematically-false", "invalid");
  if (ev.outcome === "equivalent" && ev.newlyExcluded.length === 0 && ev.certificate) {
    const ok = checkSymbolicCertificate(ev.certificate as KernelCertificate, before, after, [], (ev.certificate as KernelCertificate).restrictions).outcome === "verified";
    return ok ? { ok: true, reason: "equivalent", used: [], missing: [], certificate: ev.certificate as KernelCertificate, outcome: "equivalent" } : no("kernel-replay-failed");
  }
  if (ev.outcome === "conditional") {
    const fromText = (r: string): SymbolicAssumption | null => { const m = /^(?:carry|new):(nonzero|positive|nonnegative):(.*)$/.exec(r); if (!m) return null; try { return { kind: m[1] as any, expression: JSON.parse(m[2]) }; } catch { return null; } };
    const isConst = (a: SymbolicAssumption) => (a.expression as any).kind === "constant" && (() => { const [x, y = "1"] = String((a.expression as any).value).split("/"); const q = Number(x) / Number(y); return Number.isFinite(q) && q !== 0; })();
    const parsed = ev.newlyExcluded.map(fromText);
    if (parsed.some((a) => !a)) return no("domain-restriction-lost:" + ev.newlyExcluded.join(";"), "conditional");
    const need = [...ev.requiredAssumptions, ...(parsed as SymbolicAssumption[])].filter((a) => !(a.kind === "nonzero" && isConst(a)));
    if (!need.length && ev.certificate) { const c = ev.certificate as KernelCertificate; return checkSymbolicCertificate(c, before, after, [], c.restrictions).outcome === "verified" ? { ok: true, reason: "equivalent", used: [], missing: [], certificate: c, outcome: "equivalent" } : no("kernel-replay-failed"); }
    const missing = need.filter((a) => !covered(a, declared));
    if (missing.length) return no("missing-assumption:" + missing.map(aKey).join(";"), "conditional", missing);
    const used = need;   // the kernel-shaped assumptions, each covered by a declared one
    const re = verifySymbolicTransformation(before, after, used, { purpose: "algebra" });
    if (re.outcome === "equivalent" && re.newlyExcluded.length === 0 && re.certificate && kernelCheck(re.certificate as KernelCertificate, before, after, used, declared)) return { ok: true, reason: "equivalent-under-declared-assumptions", used, missing: [], certificate: re.certificate as KernelCertificate, outcome: "equivalent" };
    return no("assumption-replay-failed", "conditional");
  }
  return no(ev.outcome === "resource-exhausted" ? "resource-exhausted" : "kernel-inconclusive");
}

// ------------------------------------------------------------------------------------------------ line authorization
export interface PartCertificate { side: number; rule: string; grade: Grade | "none"; source: string; replacement: string; rewrite: RewriteCertificate | null; kernel: KernelCertificate | null; assumptions: SymbolicAssumption[] }
export interface DerivationCertificate {
  version: typeof DERIVATION_CERTIFICATE_VERSION;
  task: { digest: string; conditions: string[] };
  line: number;
  sources: string[];                 // the visible expressions the line is derived from (canonical)
  results: string[];                 // what the line asserts (canonical)
  parts: PartCertificate[];
  move: { kind: string; parameter: string | null };
  assumptions: string[];             // assumptions used (canonical JSON)
  domainConditions: string[];        // restrictions the kernel carried
  dependencies: { line: number; digest: string }[];
  versions: { authority: string; registry: string; kernel: string };
  digest: string;
}
const digestOf = (c: Omit<DerivationCertificate, "digest">) => sha256Hex(JSON.stringify(c));
interface PartVerdict { ok: boolean; why: string; part?: PartCertificate; grades: Grade[] }
const refuse = (why: string): PartVerdict => ({ ok: false, why, grades: [] });
function gctx(task: TaskContext, l: Tree): GCtx { return { siblings: terms(l), numerals: task.numerals, denominators: task.denominators }; }

/** authorize `r` as a justified derivation of `l` (both visible text trees) in this task. */
export function authorizeExpr(task: TaskContext, l: Tree, r: Tree, side = 0): PartVerdict {
  const L = show(l), Rr = show(r);
  const part = (rule: string, grade: Grade | "none", rewrite: RewriteCertificate | null, kernel: KernelCertificate | null, assumptions: SymbolicAssumption[] = []): PartCertificate => ({ side, rule, grade, source: L, replacement: Rr, rewrite, kernel, assumptions });
  if (canon(l) === canon(r)) return { ok: true, why: "identity", part: part("identity", "none", null, null), grades: [] };
  // substitution under established equalities (the task's bindings): every occurrence of some bound variables replaced by their values, nothing else changed
  if (task.bindings && Object.keys(task.bindings).length) {
    const inL = varsOf(l), inR = varsOf(r), gone = [...inL].filter((v) => v in task.bindings! && !inR.has(v));
    if (gone.length && canon(substituteVars(l, Object.fromEntries(gone.map((v) => [v, task.bindings![v]])))) === canon(r)) return { ok: true, why: "authorized", part: part("substitute", "determined", null, null, []), grades: ["determined"] };
  }
  // under bindings, truth is decided with the values substituted: a line that substitutes AND does something else is a jump, not a false step
  if (task.bindings && Object.keys(task.bindings).length && [...varsOf(l), ...varsOf(r)].some((v) => v in task.bindings!)) {
    const bl = evalTree(substituteVars(l, task.bindings)), br = evalTree(substituteVars(r, task.bindings));
    if (bl && br && hasVar(l) !== hasVar(r)) return refuse(same(bl, br) ? "substitution-combined-with-other-steps" : "mathematically-false");
  }
  const a = evalTree(l), b = evalTree(r);
  if (isAtomT(l) && isAtomT(r) && a && b && same(a, b) && (r.k === "n" || (isFrac(r) && gcd((r as any).l.v.n, (r as any).r.v.n) === 1n))) return { ok: true, why: "representation", part: part("representation", "determined", null, null), grades: ["determined"] };
  const exact = a && b;                                                                   // closed expressions: truth is exact, authorization is the registry's
  if (exact || !(hasVar(l) || hasVar(r))) {
    if (a && b && !same(a, b)) return refuse("mathematically-false");
    const c = certifyRewrite(l, r); if (!c) return refuse(neutral(r) && !neutral(l) ? "neutral-element" : "no-registered-rewrite");   // a REGISTERED rewrite may show a unit it distributed (6*(1000-1) = 6*1000 - 6*1); an unexplained neutral element is refused
    const rp = replayRewriteCertificate(c, L, Rr); if (!rp.ok) return refuse("rewrite-replay-failed:" + rp.reason);
    const cx = gctx(task, l); const grades = c.steps.map((s) => gradeStep(s, cx));
    if (grades.includes("parametric")) return { ok: false, why: "arbitrary-parameter", grades };
    return { ok: true, why: "authorized", part: part("rewrite", grades.includes("anchored") ? "anchored" : "determined", c, c.whole), grades };
  }
  // symbolic: registered rewrites first (distribution, evaluation, factors of closed blocks), then polynomial normalization / rational simplification, always kernel-checked under the declared assumptions
  if (neutral(r) && !neutral(l)) {
    // the one exemption: a COLLECTED coefficient that came out as 1 (5x - 4x -> 1x). The unit coefficient may be left written, but only when the line also does real work (the line without it is itself authorized and differs from the source).
    const r2 = stripUnitCoefficients(r);
    if (!(canon(r2) !== canon(r) && !neutral(r2) && canon(r2) !== canon(l) && isExpandedCollected(r2))) return refuse("neutral-element");
    const inner = authorizeExpr(task, l, r2, side); if (!inner.ok || !inner.part) return refuse("neutral-element");
    return { ...inner, part: { ...inner.part, replacement: Rr, rule: inner.part.rule + "+unit-coefficient" } };
  }
  const c = certifyRewrite(l, r);
  if (c && replayRewriteCertificate(c, L, Rr).ok) { const cx = gctx(task, l); const grades = c.steps.map((s) => gradeStep(s, cx)); if (!grades.includes("parametric")) return { ok: true, why: "authorized", part: part("rewrite", grades.includes("anchored") ? "anchored" : "determined", c, c.whole), grades }; }
  if (!polyShape(r) && !polyShape(l)) return refuse("no-registered-rewrite");
  const kl = polynomialKey(L), kr = polynomialKey(Rr);
  const sv2 = checkSymbolicStep(toExpr(l), toExpr(r), task.assumptions);
  if (!sv2.ok) return { ok: false, why: sv2.reason, grades: [] };
  // factorisation (@3): the result is a product of expanded, collected factors (isFactored), whatever the shape of the source
  const normalizing = (polyShape(r) && (isExpandedCollected(r) || isExpandedCollected(l) || r.k === "b" && r.op === "/")) || noGrowth(l, r) || (isFactored(r) && hasVar(l));
  const hidden = hasFlattenedPureNumber(r);
  if (!normalizing || hidden || (kl !== null && kr !== null && kl !== kr && !task.assumptions.length && false)) return { ok: false, why: hidden ? "hidden-number-computation" : "no-registered-rewrite", grades: [] };
  return { ok: true, why: "polynomial-normalization", part: part(sv2.used.length ? "rational-simplification" : "polynomial-normalization", "determined", null, sv2.certificate, sv2.used), grades: ["determined"] };
}
const varsOf = (t: Tree): Set<string> => { const out = new Set<string>(); const w = (x: Tree): void => { if (x.k === "v") out.add(x.name); else if (x.k === "b") { w(x.l); w(x.r); } }; w(t); return out; };
/** every occurrence of each listed variable replaced by its value (a negative value as a unary minus, as a learner writes (-6)) */
export function substituteVars(t: Tree, vals: Record<string, string>): Tree {
  if (t.k === "v" && t.name in vals) { const raw = vals[t.name]; const neg = raw.startsWith("-"); const n = parseTree(neg ? raw.slice(1) : raw)!; return neg ? ({ k: "b", op: "-", l: { k: "n", v: (parseTree("0") as any).v, u: true }, r: n, g: true } as Tree) : n; }
  if (t.k !== "b") return t;
  return { ...t, l: substituteVars(t.l, vals), r: substituteVars(t.r, vals) } as Tree;
}
/** 1x -> x for a leading unit coefficient of a variable term (a collected polynomial may still show it) */
function stripUnitCoefficients(t: Tree): Tree {
  if (t.k !== "b") return t;
  if (t.op === "*" && isId(t.l, 1n) && hasVar(t.r)) return stripUnitCoefficients(t.r);
  return { ...t, l: stripUnitCoefficients(t.l), r: stripUnitCoefficients(t.r) } as Tree;
}
/** number of monomial products when every product of sums is expanded WITHOUT collecting (the "size" of an unevaluated expansion) */
export function rawCount(t: Tree): number {
  if (t.k !== "b") return 1;
  if (t.op === "+" || t.op === "-") return (t.l.k === "n" && t.l.u ? 0 : rawCount(t.l)) + rawCount(t.r);
  if (t.op === "*") return Math.min(1e6, rawCount(t.l) * rawCount(t.r));
  if (t.op === "^") { const e = evalTree(t.r); return e && e.d === 1n && e.n >= 0n && e.n <= 8n ? Math.min(1e6, rawCount(t.l) ** Number(e.n)) : 1e6; }
  return Math.min(1e6, rawCount(t.l) * rawCount(t.r));
}
/** an UNCOLLECTED rewrite (a^2 + 2a(2b) + (2b)^2 from (a+2b)^2; x^2 + 3x + 2x + 6 from (x+2)(x+3)) may not be larger than the unexpanded source: x -> 2x - x is a pad, not an expansion */
export function noGrowth(l: Tree, r: Tree): boolean {
  if (!(l.k === "b") || l.op === "+" || l.op === "-") return false;
  const termSize = addFlat(r).reduce((n, x) => n + rawCount(x.n), 0);
  return termSize <= rawCount(l) && !hasFlattenedPureNumber(r);
}
/** a pure-number computation inside a symbolic expression is a claim of its own (2x+6+17-17, 3x*1) */
export function hasFlattenedPureNumber(t: Tree): boolean {
  const walk = (n: Tree): boolean => {
    if (n.k !== "b") return false;
    const ts = addFlat(n); if (ts.filter((x) => !hasVar(x.n)).length >= 2) return true;
    const fs = mulFlat(n); if (n.op === "*" && fs.some((x, i) => i > 0 && !hasVar(x) && !hasVar(fs[i - 1]))) return true;   // two ADJACENT numeric factors (3*4*x); 2*a*(2b) merely shows its factors
    return ts.length > 1 ? ts.some((x) => walk(x.n)) : n.op === "*" ? fs.some(walk) : [n.l, n.r].some(walk);
  };
  return walk(t);
}


// ---- solved-form conclusions: `x = 2 or x = 3` must be EXACTLY the solution set of the previous equation (a function of the equation alone, so determined)
function polyCoefficients(P: Tree[], v: string): R[] | null {
  const f = (k: number): R | null => { const g = (t: Tree) => { const u = parseTree(show(t).replace(new RegExp(`\\b${v}\\b`, "g"), `(${k})`)); return u ? evalTree(u) : null; }; const a = g(P[0]), b = g(P[1]); return a && b ? mk(a.n * b.d - b.n * a.d, a.d * b.d) : null; };
  const y: R[] = []; for (let k = 0; k <= 5; k++) { const r = f(k); if (!r) return null; y.push(r); }
  const sub = (a: R, b: R) => mk(a.n * b.d - b.n * a.d, a.d * b.d), mul = (a: R, b: R) => mk(a.n * b.n, a.d * b.d), add = (a: R, b: R) => mk(a.n * b.d + b.n * a.d, a.d * b.d);
  const diffs: R[] = []; let row = y; for (let j = 0; j <= 5; j++) { diffs.push(row[0]); row = row.slice(1).map((r, i) => sub(r, row[i])); }
  if (diffs[5].n !== 0n) return null;                                                          // degree above 4
  let poly: R[] = [mk(0n, 1n)]; let ff: R[] = [mk(1n, 1n)]; let fact = 1n;                        // Newton forward-difference form -> monomials
  for (let j = 0; j <= 4; j++) { if (j > 0) { fact *= BigInt(j); const nxt: R[] = new Array(ff.length + 1).fill(mk(0n, 1n)); ff.forEach((c, i) => { nxt[i + 1] = add(nxt[i + 1], c); nxt[i] = add(nxt[i], mul(c, mk(-BigInt(j - 1), 1n))); }); ff = nxt; }
    const coef = mk(diffs[j].n, diffs[j].d * fact); poly = poly.concat(new Array(Math.max(0, ff.length - poly.length)).fill(mk(0n, 1n))); ff.forEach((c, i) => { poly[i] = add(poly[i], mul(c, coef)); }); }
  while (poly.length > 1 && poly[poly.length - 1].n === 0n) poly.pop(); return poly;
}
function rationalRootSet(poly: R[]): R[] | null {                                               // complete only when the polynomial splits over the rationals
  if (poly.length < 2) return null; let lcm = 1n; for (const c of poly) lcm = (lcm * c.d) / gcd(lcm, c.d);
  let ints = poly.map((c) => (c.n * lcm) / c.d); const roots: R[] = [];
  while (ints.length > 1 && ints[0] === 0n) { if (!roots.some((r) => r.n === 0n)) roots.push(mk(0n, 1n)); ints = ints.slice(1); }
  const divisors = (n: bigint): bigint[] => { n = n < 0n ? -n : n; const o: bigint[] = []; if (n > 1000000n) return o; for (let d = 1n; d * d <= n; d++) if (n % d === 0n) { o.push(d); if (d * d !== n) o.push(n / d); } return o; };
  let progress = true;
  while (ints.length > 1 && progress) { progress = false; const lead = ints[ints.length - 1], low = ints[0];
    outer: for (const p of divisors(low)) for (const q of divisors(lead)) for (const sg of [1n, -1n]) { const r = mk(sg * p, q); let acc = mk(0n, 1n); for (let i = ints.length - 1; i >= 0; i--) acc = mk(acc.n * r.n + ints[i] * acc.d * r.d, acc.d * r.d);
      if (acc.n === 0n) { if (!roots.some((x) => same(x, r))) roots.push(r); const out: bigint[] = []; let carry = 0n; const rn = r.n, rd = r.d; void rn; void rd; // divide by (q x - sg p)
        const qd = q, pd = sg * p; const res: bigint[] = new Array(ints.length - 1).fill(0n); let rem = 0n; for (let i = ints.length - 1; i >= 1; i--) { const c = ints[i] + rem; res[i - 1] = c / qd; rem = (res[i - 1] * pd); if (c % qd !== 0n) return null; } void out; void carry; ints = res; progress = true; break outer; } }
  }
  return ints.length === 1 ? roots : null;
}
const parseConclusion = (text: string): { v: string; values: R[] } | null => {
  const t = strip(text).trim(); const clauses = t.split(/\s+or\s+|\s*[,;]\s*/i); if (!clauses.length) return null; let v = ""; const values: R[] = [];
  for (const c of clauses) { const m = /^([A-Za-z])\s*=\s*(.+)$/.exec(c.trim()); if (!m) return null; if (v && v !== m[1]) return null; v = m[1]; const n = parseTree(m[2]); if (!n || hasVar(n) || !(isAtomT(n) || isNegAtom(n))) return null; const q = evalTree(n); if (!q) return null; values.push(q); }
  return { v, values };
};
/** the rational solution set of an equation in the task's domain (exact; null when not finite-rational or outside the surface) */
function solutionValues(task: TaskContext, st: Statement, v: string): R[] | null {
  if (task.domain && task.domain.v === v) { const r = rationalSolutionSet(st, task.domain); return r ? r.map((x) => mk(x.n, x.d)) : null; }
  const poly = polyCoefficients([st.left, st.right], v); return poly ? rationalRootSet(poly) : null;
}
const parseConclusionValueTree = (v: string, c: R): Tree => parseTree(c.d === 1n ? `${c.n}` : `${c.n}/${c.d}`)!;
// ---- zero-product (Milestone 2): `A1 · A2 · … = 0` with every Ai linear in v (or a non-zero constant) has exactly the roots of its factors: over a field
// (Q, R, C) a product is 0 iff a factor is 0, so reading `v = r1 or v = r2 …` off the factors is an equivalence. Anything else returns null.
const factorsOf = (t: Tree): Tree[] => (t.k === "b" && t.op === "*" ? [...factorsOf(t.l), ...factorsOf(t.r)] : [t]);
function zeroProductRoots(P: Tree[], v: string): R[] | null {
  if (P.length !== 2) return null;
  const zi = P.findIndex((t) => !hasVar(t) && !!evalTree(t) && evalTree(t)!.n === 0n); if (zi < 0) return null;
  const fs = factorsOf(P[1 - zi]); if (fs.length < 2 && !hasVar(fs[0])) return null;
  const roots: R[] = [];
  for (const f of fs) {
    if (!hasVar(f)) { const c = evalTree(f); if (!c || c.n === 0n) return null; continue; }
    const poly = polyCoefficients([f, parseTree("0")!], v); if (!poly || poly.length !== 2 || poly[1].n === 0n) return null;      // linear in v
    const r = mk(-poly[0].n * poly[1].d, poly[0].d * poly[1].n); if (!roots.some((x) => same(x, r))) roots.push(r);
  }
  return roots.length ? roots : null;
}
/** square-root@1 (Milestone 2): `L^2 = c` with L linear in v and c a constant: L = ±√c, read off directly (rational roots only; else null) */
function squareRootRoots(P: Tree[], v: string): R[] | null {
  if (P.length !== 2) return null;
  const si = P.findIndex((t) => t.k === "b" && t.op === "^" && !hasVar(t.r) && !!evalTree(t.r) && same(evalTree(t.r)!, mk(2n, 1n))); if (si < 0 || hasVar(P[1 - si])) return null;
  const L = (P[si] as Extract<Tree, { k: "b" }>).l; const lin = polyCoefficients([L, parseTree("0")!], v); if (!lin || lin.length !== 2 || lin[1].n === 0n) return null;
  const poly = polyCoefficients(P, v); return poly ? rationalRootSet(poly) : null;
}
const visibleRoots = (P: Tree[], v: string): R[] | null => zeroProductRoots(P, v) ?? squareRootRoots(P, v);
const singleVariable = (ts: Tree[]): string | null => { const names = new Set<string>(); const walk = (t: Tree): void => { if (t.k === "v") names.add(t.name); else if (t.k === "b") { walk(t.l); walk(t.r); } }; ts.forEach(walk); return names.size === 1 ? [...names][0] : null; };
const substitute = (t: Tree, v: string, r: R): R | null => { const u = parseTree(show(t).replace(new RegExp(`\\b${v}\\b`, "g"), `(${r.n}/${r.d})`)); return u ? evalTree(u) : null; };
/** loses-solution@1 (Milestone 2): a step from equation P to the claim N is FALSE when some exact root of P (P splits over Q) does not satisfy N:
 *  N does not follow from P, so a solution has been lost. Fail-closed: only a certain counterexample makes a line invalid; anything else is left to authorization. */
export function lostSolution(prev: Tree[], v: string, next: { trees?: Tree[]; values?: R[] }): R | null {
  const poly = polyCoefficients(prev, v); const roots = poly && poly.length > 1 ? rationalRootSet(poly) : null; if (!roots) return null;
  for (const r of roots) {
    if (next.values) { if (!next.values.some((x) => same(x, r))) return r; continue; }
    if (!next.trees || next.trees.length !== 2) return null;
    const a = substitute(next.trees[0], v, r), b = substitute(next.trees[1], v, r);
    if (a && b && !same(a, b)) return r;
  }
  return null;
}
// ---- equation moves
const sumOf = (ts: { n: Tree; s: number }[]): Tree => ts.length === 0 ? parseTree("0")! : ts.map((t) => (t.s < 0 ? ({ k: "b", op: "-", l: { k: "n", v: (parseTree("0") as any).v, u: true }, r: t.n } as Tree) : t.n)).reduce((x, y) => (y.k === "b" && y.op === "-" && y.l.k === "n" && (y.l as any).u ? ({ k: "b", op: "-", l: x, r: y.r } as Tree) : ({ k: "b", op: "+", l: x, r: y } as Tree)));
const bin = (op: "+" | "-" | "*" | "/", l: Tree, r: Tree): Tree => ({ k: "b", op, l, r });
function equationMove(task: TaskContext, P: Tree[], N: Tree[], firstLine = false): { ok: boolean; why: string; kind: string; parameter: string | null; parts: PartCertificate[]; grades: Grade[] } {
  const fail = (why: string) => ({ ok: false, why, kind: "none", parameter: null as string | null, parts: [] as PartCertificate[], grades: [] as Grade[] });
  const done = (kind: string, parameter: string | null, parts: PartCertificate[], grades: Grade[] = []) => ({ ok: true, why: kind, kind, parameter, parts, grades });
  if (P.length !== 2 || N.length !== 2) return fail("equation-shape");
  if (N.every((n, i) => canon(n) === canon(P[i]))) return done("identity", null, []);
  if (canon(N[0]) === canon(P[1]) && canon(N[1]) === canon(P[0])) return done("symmetry", null, []);
  // independent side rewrites
  const sideRes = N.map((n, i) => (canon(n) === canon(P[i]) ? null : authorizeExpr(task, P[i], n, i)));
  if (sideRes.every((v) => v === null || v.ok)) { const parts = sideRes.flatMap((v) => (v?.part ? [v.part] : [])); return done("side-rewrite", null, parts, sideRes.flatMap((v) => v?.grades ?? [])); }
  // balance: both sides take the same operation with the same nonzero closed parameter, shown
  for (const op of ["+", "-", "*", "/"] as const) {
    const opSplit = (n: Tree): [Tree, Tree] | null => {                                                 // `-45/9` is parsed as -(45/9): the sign belongs to the numerator, (-45)/9
      if (n.k === "b" && n.op === op) return [n.l, n.r];
      if ((op === "*" || op === "/") && n.k === "b" && n.op === "-" && n.l.k === "n" && (n.l as any).u && n.r.k === "b" && n.r.op === op) return [{ ...n, r: n.r.l } as Tree, n.r.r];
      return null;
    };
    const m = N.map((n, i) => { const sp = opSplit(n); return sp && canon(sp[0]) === canon(P[i]) ? sp[1] : null; });
    if (m[0] && m[1] && canon(m[0]) === canon(m[1]) && !hasVar(m[0]) && evalTree(m[0]) && (op === "+" || op === "-" || !evalTree(m[0])!.n === false && evalTree(m[0])!.n !== 0n)) return done("balance", op + show(m[0]), []);
    if (m[0] && m[1] && (op === "*" || op === "/") && canon(m[0]) === canon(m[1]) && m[0].k === "v") {                  // multiplying / dividing both sides by a VARIABLE needs the task to declare it nonzero (x^2 = 4x, x != 0)
      const ex = toExpr(m[0]); if (ex && covered({ kind: "nonzero", expression: ex }, task.assumptions)) return done("balance", op + show(m[0]) + " [nonzero declared]", []);
    }
  }
  // transposition and factor cancellation (balance followed by the cancellation of the parameter), the other side optionally evaluated by an authorized, determined rewrite
  for (const i of [0, 1]) {
    const j = 1 - i, ts = addFlat(P[i]), fs = mulFlat(P[i]);
    const finish = (kind: string, par: string, ni: Tree, expectOther: Tree): ReturnType<typeof fail> | ReturnType<typeof done> => {
      const zero = parseTree("0")!, one = parseTree("1")!;
      const spell = new Set([canon(ni), ...(kind === "transposition" ? [canon(bin("+", ni, zero)), canon(bin("+", zero, ni))] : [canon(bin("*", one, ni)), canon(bin("*", ni, one))])]);   // the cancelled parameter may be left written as +0 / 1*
      if (!spell.has(canon(N[i]))) return fail("no-match");
      if (canon(N[j]) === canon(expectOther)) return done(kind, par, []);
      const au = authorizeExpr(task, expectOther, N[j], j); if (!au.ok || au.grades.includes("anchored") || au.grades.includes("parametric")) return fail("no-match");
      return done(kind, par, au.part ? [au.part] : [], au.grades);
    };
    for (let k = 0; k < ts.length && (ts.length > 1 || (hasVar(ts[k].n) && monomial(ts[k].n) !== null)); k++) if (!hasVar(ts[k].n) ? !!evalTree(ts[k].n) : monomial(ts[k].n) !== null) {   // a closed term or a monomial moves across the equals sign
      const rest = sumOf(ts.filter((_, q) => q !== k)), t = ts[k].n;
      const other = ts[k].s > 0 ? bin("-", P[j], t) : bin("+", P[j], t);
      const r = finish("transposition", (ts[k].s > 0 ? "-" : "+") + show(t), rest, other); if (r.ok) return r;
    }
    for (let k = 0; k < fs.length && fs.length > 1; k++) if (!hasVar(fs[k]) && evalTree(fs[k]) && evalTree(fs[k])!.n !== 0n) {
      const rest = fs.filter((_, q) => q !== k).reduce((x, y) => bin("*", x, y)), c = fs[k];
      const r = finish("cancel-factor", "/" + show(c), rest, bin("/", P[j], c)); if (r.ok) return r;
    }
    if (P[i].k === "b" && P[i].op === "/" && !hasVar(P[i].r) && evalTree(P[i].r) && evalTree(P[i].r)!.n !== 0n) { const r = finish("cancel-divisor", "*" + show(P[i].r), P[i].l, bin("*", P[j], P[i].r)); if (r.ok) return r; }
  }
  // solve-linear: `v = c` where c is the exact solution of the previous equation after ONE visible inverse operation (a determined consequence: the solution is a function of the equation alone).
  // Several operations at once (x/6 - 1 = 4 -> x = 30) skip the balance steps: they are NOT authorized (independent corpus 3, B2-B4).
  for (const i of [0, 1]) {
    const v = N[i], c = N[1 - i]; if (!(v.k === "v") || hasVar(c) || !evalTree(c) || !(isAtomT(c) || isNegAtom(c))) continue;   // the conclusion is a plain numeral: a computation inside it is a claim of its own
    const at = (t: Tree, k: string): R | null => { const u = parseTree(show(t).replace(new RegExp(`\\b${v.name}\\b`, "g"), `(${k})`)); return u ? evalTree(u) : null; };
    const f = (k: string): R | null => { const a0 = at(P[0], k), b0 = at(P[1], k); return a0 && b0 ? mk(a0.n * b0.d - b0.n * a0.d, a0.d * b0.d) : null; };
    const oneOp = (() => { const pv = P.find((t) => hasVar(t)), pc = P.find((t) => !hasVar(t)); if (!pv || !pc || P.filter((t) => hasVar(t)).length !== 1 || !evalTree(pc)) return false;
      return pv.k === "b" && "+-*/".includes(pv.op) && ((pv.l.k === "v" && pv.l.name === v.name && !hasVar(pv.r) && !!evalTree(pv.r)) || (pv.r.k === "v" && pv.r.name === v.name && !hasVar(pv.l) && !!evalTree(pv.l))); })();
    if (!oneOp && !firstLine) continue;                                                              // a derivation with a jump is refused; only a bare answer claim (the first line) may state the solution of the task itself
    const f0 = f("0"), f1 = f("1"), f2 = f("2"); if (!f0 || !f1 || !f2) continue;
    const d1 = mk(f1.n * f0.d - f0.n * f1.d, f1.d * f0.d), d2 = mk(f2.n * f1.d - f1.n * f2.d, f2.d * f1.d);
    if (!same(d1, d2) || d1.n === 0n) continue;                                                   // not linear in v (or no unique solution)
    const sol = mk(-f0.n * d1.d, f0.d * d1.n), cv = evalTree(c)!;
    if (same(sol, cv)) return done(oneOp ? "solve-linear" : "answer-claim", null, []);
  }
  // the equation rewritten as a polynomial identity: both sides normalised, nothing hidden (checked by the sides' own authorization above); anything else is refused
  const g = generalBalance(task, P, N, "=", "=");
  if (g) return done(g.kind, g.parameter, g.parts, g.grades);
  return fail("no-registered-equation-move");
}

// ---- general balance (@3): ONE operation applied to both sides, then each side rewritten by an authorized, determined rewrite.
// The operation is taken from what is visible in the line before: one of its additive terms or a whole side (added / subtracted), one of its numbers,
// numeric denominators (their least common multiple), variable denominators or variable factors (multiplied / divided by). A multiplier must be
// provably nonzero (a nonzero number, declared nonzero, the task's own denominator, or no real root in the domain): otherwise multiplying is an
// IMPLICATION only (candidates must be checked later) and dividing is refused. For an inequality the multiplier's sign must be provable; it flips
// the relation when negative; an unknown sign is refused. Squaring both sides of an equation is an implication. Several operations in one line are
// still refused (each line one operation: a jump skips steps the learner has not shown).
export interface BalanceMove { kind: string; parameter: string; parts: PartCertificate[]; grades: Grade[]; implication: boolean }
const neg = (t: Tree): Tree => ({ k: "b", op: "-", l: { k: "n", v: (parseTree("0") as any).v, u: true }, r: t, g: true } as Tree);
const grp = (t: Tree): Tree => (t.k === "b" ? ({ ...t, g: true } as Tree) : t);
function sideTo(task: TaskContext, Q: Tree, n: Tree, side: number): PartVerdict | null {
  if (canon(Q) === canon(n)) return { ok: true, why: "identity", part: undefined, grades: [] };
  const au = authorizeExpr(task, Q, n, side); if (!au.ok || au.grades.includes("anchored") || au.grades.includes("parametric")) return null;
  return au;
}
const flipRel = (r: Rel): Rel => (r === "<" ? ">" : r === ">" ? "<" : r === "<=" ? ">=" : r === ">=" ? "<=" : "=");
export function generalBalance(task: TaskContext, P: Tree[], N: Tree[], relP: Rel, relN: Rel): BalanceMove | null {
  const both = (Q: Tree[], kind: string, parameter: string, implication = false, expectRel: Rel = relP): BalanceMove | null => {
    if (expectRel !== relN) return null;
    if (canon(Q[0]) === canon(P[0]) && canon(Q[1]) === canon(P[1])) return null;
    const a = sideTo(task, Q[0], N[0], 0); if (!a) return null; const b = sideTo(task, Q[1], N[1], 1); if (!b) return null;
    return { kind, parameter, parts: [a.part, b.part].filter((x): x is PartCertificate => !!x), grades: [...a.grades, ...b.grades], implication };
  };
  const seen = new Set<string>();
  // additive: subtract a visible term (or a whole side) from both sides; a negative term is added
  const adds: { t: Tree; sub: boolean }[] = [];
  for (const side of P) { for (const x of addFlat(side)) adds.push({ t: x.n, sub: x.s > 0 }); if (addFlat(side).length > 1) adds.push({ t: grp(side), sub: true }); }
  for (const { t, sub } of adds) { const key = (sub ? "-" : "+") + canon(t); if (seen.has(key)) continue; seen.add(key);
    const r = both(P.map((x) => bin(sub ? "-" : "+", x, t)), "balance-add", (sub ? "-" : "+") + show(t)); if (r) return r; }
  // multiplicative
  const dom = task.domain ?? null;
  const ks: Tree[] = []; const add = (t: Tree) => { if (!ks.some((k) => canon(k) === canon(t))) ks.push(t); };
  const nums: R[] = []; const walkN = (t: Tree): void => { if (t.k === "n" && !t.u) { const v = evalTree(t); if (v && v.n !== 0n) nums.push(v.n < 0n ? mk(-v.n, v.d) : v); } else if (t.k === "b") { walkN(t.l); walkN(t.r); } };
  P.forEach(walkN);
  // the common denominator: every numeric divisor and decimal place in the line, and every variable denominator (their product)
  const numDivs: bigint[] = []; const walkD = (t: Tree): void => { if (t.k !== "b") { if (t.k === "n" && !t.u) { const v = evalTree(t); if (v && v.d !== 1n) numDivs.push(v.d); } return; } if (t.op === "/" && !hasVar(t.r)) { const v = evalTree(t.r); if (v && v.d === 1n && v.n !== 0n) numDivs.push(v.n < 0n ? -v.n : v.n); } walkD(t.l); walkD(t.r); };
  P.forEach(walkD);
  const dens = [...P.flatMap((t) => denomsOf(t)), ...numDivs]; const lcd = dens.length ? dens.reduce((a, d) => (a * d) / gcd(a, d), 1n) : 1n; if (lcd > 1n) nums.push(mk(lcd, 1n));
  for (const v of nums) { const t = parseTree(v.d === 1n ? `${v.n}` : `${v.n}/${v.d}`); if (t) { add(t); add(neg(t)); } }
  for (const side of P) { for (const d of varDenominators(side)) add(grp(d)); for (const f of mulFlat(side)) if (hasVar(f)) add(grp(f)); }
  { const vd: Tree[] = []; for (const side of P) for (const d of varDenominators(side)) if (!vd.some((x) => canon(x) === canon(d))) vd.push(d);
    if (vd.length > 1) { const prod = vd.map(grp).reduce((a, b) => bin("*", a, b)); add(prod); if (lcd > 1n) add(bin("*", parseTree(`${lcd}`)!, prod)); }
    if (vd.length === 1 && lcd > 1n) add(bin("*", parseTree(`${lcd}`)!, grp(vd[0]))); }
  for (const k of ks) {
    const closed = !hasVar(k), kv = closed ? evalTree(k) : null; if (closed && (!kv || kv.n === 0n)) continue;
    const ex = toExpr(k);
    const declaredNonzero = !!ex && (covered({ kind: "nonzero", expression: ex }, task.assumptions) || covered({ kind: "positive", expression: ex }, task.assumptions));
    const nonzero = closed || declaredNonzero || (!!dom && provablyNonzero(k, dom));
    const sign: 1 | -1 | 0 = closed ? (kv!.n > 0n ? 1 : -1) : !!ex && covered({ kind: "positive", expression: ex }, task.assumptions) ? 1 : dom ? provableSign(k, dom) : 0;
    for (const op of ["*", "/"] as const) {
      const Q = P.map((x) => bin(op, grp(x), k)), par = op + show(k);
      if (relP === "=") {
        if (nonzero) { const r = both(Q, op === "*" ? "balance-multiply" : "balance-divide", par + (closed ? "" : " [nonzero]")); if (r) return r; }
        else if (op === "*") { const r = both(Q, "implication:multiply", par + " [may be zero: candidates must be checked]", true); if (r) return r; }
      } else if (sign !== 0) { const r = both(Q, op === "*" ? "balance-multiply" : "balance-divide", par + (sign < 0 ? " [negative: relation reversed]" : ""), false, sign < 0 ? flipRel(relP) : relP); if (r) return r; }
    }
  }
  // squaring both sides (equations): an implication
  if (relP === "=") { const two = parseTree("2")!; const r = both(P.map((x) => ({ k: "b", op: "^", l: grp(x), r: two } as Tree)), "implication:square", "^2 [candidates must be checked]", true); if (r) return r; }
  return null;
}

// ------------------------------------------------------------------------------------------------ the derivation session (one task, an ordered chain of lines)
export interface LineVerdict { line: number; valid: boolean | null; authorized: boolean; reason: string; grades: Grade[]; certificate: DerivationCertificate | null }
const splitSides = (text: string): string[] | null => { const t = strip(text); if (/[A-Za-z]{3,}|\b(?:ln|pi|or|if)\b|[A-Za-z]+\s+[A-Za-z]+/i.test(t)) return null; if (/[<>≤≥≠]|!=/.test(t) || /\s(or|and)\s|[;]/i.test(t)) return null; const s = t.split("=").map((x) => x.trim()); return s.length >= 1 && s.every(Boolean) ? s : null; };
export class DerivationSession {
  readonly task: TaskContext | null; readonly failure: string | null;
  readonly chain: DerivationCertificate[] = [];
  private pool: Tree[]; private last: Tree[];
  /** @3: an implication-only step was taken (candidates must then be checked against the task); the relation of the last inequality; the last conclusion's values */
  private implied = false; private lastRel: Rel = "="; private candidates: R[] | null = null;
  /** @3: the equations of a disjunction line ("x - 7 = 0 or x + 3 = 0"), each then solved on its own */
  private branches: Tree[][] | null = null;
  constructor(statement: string, readonly extraNumerals: readonly string[] = []) {
    const t = normalizeTask(statement, extraNumerals);
    this.task = t.ok ? t.task : null; this.failure = t.ok ? null : t.reason;
    this.pool = this.task ? [...this.task.trees] : []; this.last = this.task ? [...this.task.trees] : [];
    if (this.task?.rel) this.lastRel = this.task.rel;
  }
  /** make an earlier ACCEPTED expression visible (a line a route verified before this chain began). It carries no certificate and authorizes nothing by itself. */
  adopt(text: string): void { const ss = splitSides(text); if (!ss) return; for (const x of ss) { const t = parseTree(x); if (t) this.pool.push(t); } }
  /** judge one line against the task and the lines accepted so far. A refused line is NOT added to the chain (later lines cannot depend on it). */
  append(text: string): LineVerdict {
    const line = this.chain.length;
    const out = (authorized: boolean, reason: string, valid: boolean | null, grades: Grade[] = [], certificate: DerivationCertificate | null = null): LineVerdict => ({ line, valid, authorized, reason, grades, certificate });
    if (!this.task) return out(false, this.failure ?? "task-unparsed", null);
    const task = this.task;
    if (ambiguousNotation(text)) return out(false, "line-unparsed", null);
    const solvedSingle = /^\s*[A-Za-z]\s*=\s*-?\d+(?:\.\d+)?(?:\/\d+)?\s*$/.test(strip(text));
    if (task.mode === "equation" && this.last.length === 2 && (/\bor\b|[,;]/i.test(text) || (this.implied && solvedSingle))) {   // a solved-form conclusion: the complete solution set of the equation before it
      const cl = parseConclusion(text);
      if (cl) {
        const prevSt: Statement = { left: this.last[0], rel: "=", right: this.last[1] };
        const roots = solutionValues(task, prevSt, cl.v);
        const setEq = (a: R[], b: R[]) => a.length === b.length && a.every((x) => b.some((y) => same(x, y))) && new Set(a.map((x) => `${x.n}/${x.d}`)).size === a.length;
        if (this.branches && this.branches.length === cl.values.length) {
          // each branch of a split solved on its own, in order: branch j to `v = c_j` by one registered equation move
          const bs = this.branches; const okAll = cl.values.every((c, j) => { const tgt = [parseTree(cl.v)!, parseTree(showR(c).startsWith("-") ? `0${showR(c)}` : showR(c))!]; const direct = canon(bs[j][0]) === canon(tgt[0]) && evalTree(bs[j][1]) && same(evalTree(bs[j][1])!, c); return direct || equationMove(task, bs[j], [tgt[0], parseConclusionValueTree(cl.v, c)], false).ok; });
          if (!okAll) return out(false, "branch-not-solved", null);
          this.branches = null; this.candidates = cl.values;
          return this.seal(line, task, bs.map((b) => `${canon(b[0])}=${canon(b[1])}`), [strip(text)], [], "branchwise-solve", cl.values.map((r) => `${r.n}/${r.d}`).join(","), [], null);
        }
        if (this.implied) {
          // after an implication-only step the candidates must be checked: the conclusion keeps exactly the candidates that solve the TASK (in its domain)
          const target = solutionValues(task, { left: task.trees[0], rel: "=", right: task.trees[1] }, cl.v);
          const cands = this.candidates ?? visibleRoots(this.last, cl.v) ?? [];
          // listing every candidate (the roots of the line before, read off where visible) is a step of its own; checking them comes after
          const vis = visibleRoots(this.last, cl.v), allRoots = rationalSolutionSet(prevSt, fullDomain(cl.v));
          if (!(target && setEq(cl.values, target)) && vis && allRoots && setEq(cl.values, vis) && setEq(vis, allRoots.map((x) => mk(x.n, x.d)))) { this.candidates = cl.values; return this.seal(line, task, this.last.map(canon), [strip(text)], [], "candidates", cl.values.map((r) => `${r.n}/${r.d}`).join(","), [], null); }
          if (!target || !setEq(cl.values, target) || !cl.values.every((x) => cands.some((y) => same(x, y)))) return out(false, target ? "candidates-not-checked" : "no-registered-equation-move", null);
          this.candidates = cl.values;
          return this.seal(line, task, this.last.map(canon), [strip(text)], [], "check-candidates", cl.values.map((r) => `${r.n}/${r.d}`).join(","), [], null);
        }
        const ok = !!roots && setEq(cl.values, roots);
        if (!ok && roots && task.domain && task.domain.v === cl.v) {
          // the candidates of the polynomial before the domain is applied (a denominator's zero, a declared condition): a legitimate list ONLY as
          // candidates; they must then be checked (the session is now in candidate mode, exactly as after an implication-only step)
          const all = rationalSolutionSet(prevSt, fullDomain(cl.v)); const vis = visibleRoots(this.last, cl.v);
          if (all && setEq(cl.values, all.map((x) => mk(x.n, x.d))) && line > 0 && vis && setEq(vis, cl.values)) { this.implied = true; this.candidates = cl.values; return this.seal(line, task, this.last.map(canon), [strip(text)], [], "candidates-before-domain", cl.values.map((r) => `${r.n}/${r.d}`).join(","), [], null); }
        }
        if (!ok) return out(false, roots ? "solution-set-differs" : "no-registered-equation-move", null);
        // Milestone 2 (zero-product@1): the solution set may be READ OFF only where it is visible: from factors (zero-product) or as a bare first-line answer
        // claim; a jump from an unfactored polynomial to its roots skips the method, like a several-operation jump in a linear equation, and is refused.
        // @3: roots the domain excludes (a denominator's zero, a declared condition) are not solutions and are not read off
        const zp0 = visibleRoots(this.last, cl.v), zp = zp0 && zp0.filter((r) => roots!.some((x) => same(x, r)));
        if (line === 0) { this.candidates = cl.values; return this.seal(line, task, this.last.map(canon), [strip(text)], [], "answer-claim", null, [], null); }
        if (!zp || zp.length !== cl.values.length || !zp.every((r) => cl.values.some((x) => same(x, r)))) return out(false, "solve-jump", null);
        this.candidates = cl.values;
        return this.seal(line, task, this.last.map(canon), [strip(text)], [], zeroProductRoots(this.last, cl.v) ? "zero-product" : "square-root", zp.map((r) => `${r.n}/${r.d}`).join(","), [], null); }
    }
    if (task.mode === "inequality") return this.appendInequality(line, task, text, out);
    // @3: a disjunction of equations: a split of a product equal to zero, or of a square equal to a constant; then each branch moved on its own
    if (task.mode === "equation" && /\s+or\s+/i.test(strip(text))) {
      const clauses = strip(text).split(/\s+or\s+/i).map((c) => { const ss = splitSides(c); const ts = ss?.map((x) => parseTree(x)); return ts && ts.length === 2 && ts.every((x) => x) ? (ts as Tree[]) : null; });
      if (clauses.length < 2 || clauses.some((c) => !c)) return out(false, "line-unparsed", null);
      const C = clauses as Tree[][];
      if (!this.branches) {
        const P = this.last; const isZero = (t: Tree) => !hasVar(t) && !!evalTree(t) && evalTree(t)!.n === 0n;
        const zi = P.findIndex(isZero);
        if (zi >= 0) { const fs = factorsOf(P[1 - zi]).filter(hasVar); const cl0 = C.map((c) => (isZero(c[1]) ? c[0] : isZero(c[0]) ? c[1] : null));
          if (fs.length === C.length && cl0.every((x) => x) && fs.every((f) => cl0.some((x) => canon(x!) === canon(f.k === "b" ? { ...f, g: undefined } as Tree : f) || canon(x!) === canon(f)))) { this.branches = C; return this.seal(line, task, P.map(canon), C.map((c) => `${canon(c[0])}=${canon(c[1])}`), [], "split-zero-product", null, [], null); } }
        const si = P.findIndex((t) => t.k === "b" && t.op === "^" && !hasVar(t.r) && !!evalTree(t.r) && same(evalTree(t.r)!, mk(2n, 1n)));
        if (si >= 0 && !hasVar(P[1 - si]) && C.length === 2) { const c = evalTree(P[1 - si]); const L = (P[si] as Extract<Tree, { k: "b" }>).l;
          const rt = c && c.n > 0n ? (() => { const sq = (x: bigint) => { let r = BigInt(Math.floor(Math.sqrt(Number(x)))); while (r * r > x) r--; while ((r + 1n) * (r + 1n) <= x) r++; return r * r === x ? r : null; }; const a = sq(c.n), b = sq(c.d); return a !== null && b !== null ? mk(a, b) : null; })() : null;
          const vals = C.map((x) => (canon(x[0]) === canon(L) && !hasVar(x[1]) ? evalTree(x[1]) : null));
          if (rt && vals.every((x) => x) && vals.some((x) => same(x!, rt)) && vals.some((x) => same(x!, mk(-rt.n, rt.d)))) { this.branches = C; return this.seal(line, task, P.map(canon), C.map((c) => `${canon(c[0])}=${canon(c[1])}`), [], "split-square-root", showR(rt), [], null); } }
        return out(false, "no-registered-equation-move", null);
      }
      if (C.length !== this.branches.length) return out(false, "branch-count-differs", null);
      const bs = this.branches; if (!C.every((c, j) => (canon(c[0]) === canon(bs[j][0]) && canon(c[1]) === canon(bs[j][1])) || equationMove(task, bs[j], c, false).ok)) return out(false, "branch-not-derived", null);
      this.branches = C;
      return this.seal(line, task, bs.map((b) => `${canon(b[0])}=${canon(b[1])}`), C.map((c) => `${canon(c[0])}=${canon(c[1])}`), [], "branchwise", null, [], null);
    }
    if (this.branches) return out(false, "line-after-branches", null);
    const ss = splitSides(text); if (!ss) return out(false, "line-unparsed", null);
    const T = ss.map((x) => parseTree(x)); if (T.some((t) => !t)) return out(false, "line-unparsed", null);
    const sides = T as Tree[];
    // a substitution task's defined name ("y = 5(-6) + 10" for "find y where y = 5x + 10") stands for the task's expression
    if (task.mode === "expression" && task.defined && sides[0].k === "v" && sides[0].name === task.defined && sides.length > 1) sides[0] = this.last[this.last.length - 1];   // y stands for its current value
    const seen = (t: Tree) => this.pool.some((p) => sameUpToFractionRegrouping(p, t));
    const parts: PartCertificate[] = []; const grades: Grade[] = []; let kind = "chain", parameter: string | null = null; let valid: boolean | null = true; const sources: string[] = [];
    if (task.mode === "expression") {
      // validity of every consecutive pair first (exact arithmetic; symbolic pairs by the kernel with the declared assumptions)
      const bound = (t: Tree) => (task.bindings && Object.keys(task.bindings).length ? substituteVars(t, task.bindings) : t);
      for (let j = 1; j < sides.length; j++) { const a = evalTree(bound(sides[j - 1])), b = evalTree(bound(sides[j])); if (a && b) { if (!same(a, b)) return out(false, "mathematically-false", false); } else if (hasVar(sides[j - 1]) || hasVar(sides[j])) { const k = checkSymbolicStep(toExpr(sides[j - 1]), toExpr(sides[j]), task.assumptions); if (k.outcome === "invalid") return out(false, "mathematically-false", false); if (!k.ok && /^(missing-assumption|domain-restriction-lost)/.test(k.reason)) valid = null; } }
      // the first side must be visible; with ONE side the line restates the previous result
      let from: Tree;
      if (sides.length === 1) { from = this.last[this.last.length - 1]; if (canon(from) !== canon(sides[0])) { const v = authorizeExpr(task, from, sides[0]); if (!v.ok) return out(false, v.why, v.why === "mathematically-false" ? false : valid, v.grades); parts.push(v.part!); grades.push(...v.grades); sources.push(canon(from)); this.last = [sides[0]]; this.pool.push(sides[0]); return this.seal(line, task, sources, [canon(sides[0])], parts, "chain", null, grades, valid); } }
      if (!seen(sides[0])) return out(false, "source-not-visible", valid);
      sources.push(canon(sides[0]));
      for (let j = 1; j < sides.length; j++) { const v = authorizeExpr(task, sides[j - 1], sides[j], j); if (!v.ok) return out(false, v.why, v.why === "mathematically-false" ? false : valid, v.grades); if (v.part) parts.push(v.part); grades.push(...v.grades); }
    } else {
      if (sides.length !== 2) return out(false, "equation-shape", null);
      const prev = this.last; const m = equationMove(task, prev, sides, this.chain.length === 0);
      if (!m.ok) return out(false, m.why, null);
      // @3: the move's effect on the solution set, decided exactly (solution-sets@1); a move may never lose a solution, and only an implication move may gain one
      const rel = task.domain ? compareStatements({ left: prev[0], rel: "=", right: prev[1] }, { left: sides[0], rel: "=", right: sides[1] }, task.domain) : null;
      if (rel?.lost) return out(false, "loses-solution", false);
      if (rel && rel.gained && !m.kind.startsWith("implication:")) return out(false, "gains-solution", null);
      if (m.kind.startsWith("implication:")) this.implied = true;
      kind = m.kind; parameter = m.parameter; parts.push(...m.parts); grades.push(...m.grades); valid = null; sources.push(...prev.map(canon));
    }
    return this.sealLine(line, task, sources, sides, parts, kind, parameter, grades, valid);
  }
  /** an inequality line: one relation, the same moves as an equation (no implication moves), every step an exact equivalence of solution sets */
  private appendInequality(line: number, task: TaskContext, text: string, out: (a: boolean, r: string, v: boolean | null, g?: Grade[]) => LineVerdict): LineVerdict {
    const t = strip(text); if (/[A-Za-z]{3,}|=|\b(?:or|and)\b/i.test(t.replace(/≤|≥/g, ""))) return out(false, "line-unparsed", null);
    const ms = t.match(/≤|≥|<|>/g) ?? []; if (ms.length !== 1) return out(false, "line-unparsed", null);
    const relN = ({ "≤": "<=", "≥": ">=", "<": "<", ">": ">" } as const)[ms[0] as "≤"] as Rel;
    const sides = t.split(ms[0]).map((x) => parseTree(x.trim())); if (sides.some((x) => !x)) return out(false, "line-unparsed", null);
    const N = sides as Tree[], P = this.last, relP = this.lastRel;
    let mv: { kind: string; parameter: string | null; parts: PartCertificate[]; grades: Grade[] } | null = null;
    if (relN === relP && N.every((n, i) => canon(n) === canon(P[i]))) mv = { kind: "identity", parameter: null, parts: [], grades: [] };
    else if (relN === flipRel(relP) && canon(N[0]) === canon(P[1]) && canon(N[1]) === canon(P[0])) mv = { kind: "symmetry", parameter: null, parts: [], grades: [] };
    else if (relN === relP) { const rs = N.map((n, i) => (canon(n) === canon(P[i]) ? null : sideTo(task, P[i], n, i))); if (rs.every((r) => r !== undefined) && rs.every((r) => r === null || r.ok) && !rs.every((r) => r === null)) mv = { kind: "side-rewrite", parameter: null, parts: rs.flatMap((r) => (r?.part ? [r.part] : [])), grades: rs.flatMap((r) => r?.grades ?? []) }; }
    if (!mv) { const g = generalBalance(task, P, N, relP, relN); if (g && !g.implication) mv = g; }
    // B2 bounded decomposition (two recognised steps, each replayable): one registered balance move, then symmetry (6 < 2x  →  3 < x  →  x > 3). The balance is certified on the
    // swapped reading of the new line; the exact solution-set comparison below still decides equivalence.
    if (!mv) { const g = generalBalance(task, P, [N[1], N[0]], relP, flipRel(relN)); if (g && !g.implication) mv = { ...g, kind: `${g.kind}+symmetry` }; }
    if (!mv) {
      // the step multiplies / divides by an expression whose sign is not established: refused (never assumed positive)
      const unknownSign = P.some((side) => mulFlat(side).concat(varDenominators(side)).some((k) => hasVar(k) && (["*", "/"] as const).some((op) => N.every((n, i) => !!sideTo(task, bin(op, grp(P[i]), grp(k)), n, i)))));
      return out(false, unknownSign ? "multiplier-of-unknown-sign" : "no-registered-inequality-move", null);
    }
    const rel = task.domain ? compareStatements({ left: P[0], rel: relP, right: P[1] }, { left: N[0], rel: relN, right: N[1] }, task.domain) : null;
    if (rel?.lost) return out(false, "loses-solution", false);
    if (!rel || rel.relation !== "equivalent") return out(false, rel ? "gains-solution" : "outside-solution-set-surface", null);
    this.lastRel = relN;
    return this.sealLine(line, task, P.map(canon), N, mv.parts, mv.kind, mv.parameter, mv.grades, null, relN);
  }
  private sealLine(line: number, task: TaskContext, sources: string[], sides: Tree[], parts: PartCertificate[], kind: string, parameter: string | null, grades: Grade[], valid: boolean | null, rel?: Rel): LineVerdict {
    this.last = [...sides]; this.pool.push(...sides);
    return this.seal(line, task, sources, rel && rel !== "=" ? [canon(sides[0]), rel, canon(sides[1])] : sides.map(canon), parts, kind, parameter, grades, valid);
  }
  private seal(line: number, task: TaskContext, sources: string[], results: string[], parts: PartCertificate[], kind: string, parameter: string | null, grades: Grade[], valid: boolean | null): LineVerdict {
    const prior = this.chain[this.chain.length - 1];
    const body: Omit<DerivationCertificate, "digest"> = { version: DERIVATION_CERTIFICATE_VERSION, task: { digest: task.digest, conditions: [...task.conditions, ...(task.natural ?? [])] }, line, sources, results, parts, move: { kind, parameter }, assumptions: [...new Set(parts.flatMap((p) => p.assumptions.map(aKey)))], domainConditions: [...new Set(parts.flatMap((p) => [...(p.rewrite?.restrictions ?? []), ...(p.kernel?.restrictions ?? [])]))], dependencies: prior ? [{ line: prior.line, digest: prior.digest }] : [], versions: { authority: AUTHORITY_VERSION, registry: REWRITE_REGISTRY_VERSION, kernel: KERNEL_VERSION } };
    const cert = { ...body, digest: digestOf(body) }; this.chain.push(cert);
    return { line, valid, authorized: true, reason: kind, grades, certificate: cert };
  }
}

// ------------------------------------------------------------------------------------------------ independent replay in the ORIGINAL task context
export interface ReplayResult { ok: boolean; reason: string; at: number | null }
/**
 * Replays a chain of certificates for `statement` from scratch: the task is re-normalised (its digest must equal every certificate's), every certificate's sources must be visible from the
 * task and the certificates BEFORE it (a forward or circular reference is refused), dependency digests must match, every part is re-validated (registry replay, grade policy, kernel under the
 * task's own assumptions) and the recorded results must be what the parts produce. A certificate taken from another task, version or position fails.
 */
export function replayDerivationChain(statement: string, texts: string[], chain: readonly DerivationCertificate[], extraNumerals: readonly string[] = []): ReplayResult {
  const bad = (reason: string, at: number | null = null): ReplayResult => ({ ok: false, reason, at });
  const t = normalizeTask(statement, extraNumerals); if (!t.ok) return bad(t.reason);
  if (chain.length !== texts.length) return bad("certificate count differs from the lines");
  const task = t.task; const s = new DerivationSession(statement, extraNumerals); const seenDigests = new Set<string>();
  for (let i = 0; i < chain.length; i++) {
    const c = chain[i]; const { digest, ...body } = c;
    if (c.version !== DERIVATION_CERTIFICATE_VERSION) return bad("unknown certificate version", i);
    if (digestOf(body) !== digest) return bad("digest mismatch (tampered certificate)", i);
    if (c.versions.authority !== AUTHORITY_VERSION || c.versions.registry !== REWRITE_REGISTRY_VERSION || c.versions.kernel !== KERNEL_VERSION) return bad("certificate was issued under different registry/authority/kernel versions", i);
    if (c.task.digest !== task.digest) return bad("certificate belongs to a different task context", i);
    if (c.line !== i) return bad("certificate is out of position", i);
    if (seenDigests.has(digest)) return bad("circular or duplicated evidence", i); seenDigests.add(digest);
    const expectDep = i ? [{ line: chain[i - 1].line, digest: chain[i - 1].digest }] : [];
    if (JSON.stringify(c.dependencies) !== JSON.stringify(expectDep)) return bad("dependency certificates do not match the chain (forward, missing or circular dependency)", i);
    // every part is replayed on its own
    for (const p of c.parts) {
      const l = parseTree(p.source), r = parseTree(p.replacement); if (!l || !r) return bad("a part does not parse", i);
      if (p.rewrite) { if (p.rewrite.visible !== canon(l) || p.rewrite.result !== canon(r)) return bad("a rewrite certificate is for different expressions", i); const rp = replayRewriteCertificate(p.rewrite, p.source, p.replacement); if (!rp.ok) return bad("rewrite replay: " + rp.reason, i); if (p.rewrite.steps.some((st) => gradeStep(st, gctx(task, l)) === "parametric")) return bad("a step needs an arbitrary parameter", i); }
      if (p.kernel) { const ex = toExpr(l), ey = toExpr(r); if (!ex || !ey || !kernelCheck(p.kernel, ex, ey, p.assumptions, task.assumptions)) return bad("kernel evidence does not verify", i); if (p.assumptions.some((a) => !covered(a, task.assumptions))) return bad("a used assumption is not declared by the task", i); }
      else if (p.rule === "substitute") { const b = task.bindings ?? {}; const vs = [...varsOf(l)].filter((x) => x in b && !varsOf(r).has(x)); if (!vs.length || canon(substituteVars(l, Object.fromEntries(vs.map((x) => [x, b[x]])))) !== canon(r)) return bad("a substitution does not reproduce its replacement", i); }
      else if (!p.rewrite && p.rule !== "identity" && p.rule !== "representation") return bad("a part carries no evidence", i);
    }
    // finally the whole line is re-authorized from scratch and must reproduce the certificate (same moves, same results)
    const v = s.append(texts[i]); if (!v.authorized || !v.certificate) return bad("re-authorization refused: " + v.reason, i);
    if (v.certificate.digest !== digest) return bad("re-authorization produced a different certificate", i);
  }
  return { ok: true, reason: "replayed: every line re-authorized in the original task context", at: null };
}

/**
 * B2 certificate compatibility (read-only, never migrates): the verification status of a STORED chain. A certificate of another version (e.g. derivation-certificate@2 issued by
 * authority@2) is never replayed as, or relabelled to, the current version: it is reported as historical evidence whose original result stands as recorded but is not re-verified.
 */
export type ChainVerificationStatus = "replayable-current" | "historical-version-not-replayable" | "failed-replay";
export function chainVerificationStatus(statement: string, texts: string[], chain: readonly { version?: unknown; versions?: { authority?: unknown } }[]): { status: ChainVerificationStatus; versions: string[]; reason: string } {
  const versions = [...new Set(chain.map((c) => `${String(c?.version)} / ${String(c?.versions?.authority)}`))];
  if (chain.some((c) => c?.version !== DERIVATION_CERTIFICATE_VERSION || c?.versions?.authority !== AUTHORITY_VERSION)) return { status: "historical-version-not-replayable", versions, reason: `issued under ${versions.join(", ")}; the current replayer is ${DERIVATION_CERTIFICATE_VERSION} / ${AUTHORITY_VERSION}, so the original result is preserved as historical evidence and not re-verified` };
  const r = replayDerivationChain(statement, texts, chain as readonly DerivationCertificate[]);
  return r.ok ? { status: "replayable-current", versions, reason: r.reason } : { status: "failed-replay", versions, reason: r.reason };
}

/** convenience: judge a whole chain; the first false line is `invalid` even when an earlier line is unauthorized */
export interface ChainVerdict { status: "verified" | "invalid" | "unsupported"; at: number | null; reason: string; lines: LineVerdict[]; chain: DerivationCertificate[]; evidence: WorkingEvidence }

// ------------------------------------------------------------------------------------------------ working evidence (@3): one record per transition
export const WORKING_EVIDENCE_CONTRACT = "openpath-working-evidence@1" as const;
export interface TransitionEvidence {
  line: number;
  /** certified-equivalence / certified-implication / certified-rewrite: authorized and replayable; invalid: provably does not follow from the line before;
   *  unsupported: neither certified nor refuted (outside the surface, unjustified, or after an uncertified line) */
  status: "certified-equivalence" | "certified-implication" | "certified-candidate-check" | "certified-rewrite" | "invalid" | "unsupported";
  /** how this line's solution set relates to the line before (exact; null when not decided) */
  relation: "equivalent" | "implies" | "implied-by" | "neither" | null;
  reason: string;
  /** a point that solves the line before but not this one (lost), or this one but not the line before (gained) */
  counterexample: { lost: unknown; gained: unknown } | null;
  move: string | null;
  certificate: string | null;
}
export interface WorkingEvidence {
  contract: typeof WORKING_EVIDENCE_CONTRACT;
  versions: { authority: string; solutionSets: string };
  task: { mode: string | null; conditions: string[]; domain: string[] };
  transitions: TransitionEvidence[];
  firstInvalid: number | null;
  /** method: certified when every line is certified; invalid when some line is; else unsupported */
  method: "certified" | "invalid" | "unsupported" | "no-working";
  /** complete: the last line states a final answer (solved form / simplified result); incomplete: it does not */
  completeness: "complete" | "incomplete" | "no-working";
  /** the final answer judged on its own, independently of the method */
  finalAnswer: { present: boolean; correct: boolean | null; claimed: string | null; reason: string };
  /** the certified steps (what was legitimately shown), in order; never a score */
  progress: string[];
}
/** a line read as a statement for solution-set comparison: an equation, an inequality, or a conclusion (`x = 2 or x = 3` as (x-2)(x-3) = 0) */
function statementOf(task: TaskContext, text: string): { st: Statement; claim: R[] | null } | null {
  const t = strip(text).trim();
  if (/\s+or\s+/i.test(t) && !parseConclusion(t)) {
    const cs = t.split(/\s+or\s+/i).map((c) => { const ss = splitSides(c); const ts = ss?.map((x) => parseTree(x)); return ts && ts.length === 2 && ts.every((x) => x) ? (ts as Tree[]) : null; });
    if (cs.length < 2 || cs.some((c) => !c)) return null;
    return { st: { left: (cs as Tree[][]).map((c) => grp(bin("-", grp(c[0]), grp(c[1])))).reduce((a, b) => bin("*", a, b)), rel: "=", right: parseTree("0")! }, claim: null };
  }
  if (/\bor\b|[,;]/i.test(t)) { const cl = parseConclusion(t); if (!cl) return null; const v = parseTree(cl.v)!;
    const prod = cl.values.map((r) => bin("-", v, parseTree(r.d === 1n ? (r.n < 0n ? `(0-${-r.n})` : `${r.n}`) : `(${r.n}/${r.d})`)!)).reduce((a, b) => bin("*", grp(a), grp(b)));
    return { st: { left: prod, rel: "=", right: parseTree("0")! }, claim: cl.values }; }
  if (/[A-Za-z]{3,}/.test(t)) return null;
  const rm = t.match(/≤|≥|<|>/g) ?? [];
  if (rm.length === 1 && !/=/.test(t)) { const [a, b] = t.split(rm[0]).map((x) => parseTree(x.trim())); if (!a || !b) return null; return { st: { left: a, rel: ({ "≤": "<=", "≥": ">=", "<": "<", ">": ">" } as const)[rm[0] as "≤"], right: b }, claim: null }; }
  const ss = splitSides(t); if (!ss || ss.length !== 2) return null; const a = parseTree(ss[0]), b = parseTree(ss[1]); if (!a || !b) return null;
  const single = (x: Tree, y: Tree) => x.k === "v" && !hasVar(y) && (isAtomT(y) || isNegAtom(y)) ? evalTree(y) : null;
  const c = single(a, b) ?? single(b, a);
  return { st: { left: a, rel: "=", right: b }, claim: c ? [c] : null };
}
const solvedForm = (st: Statement, claim: R[] | null) => !!claim || ((st.left.k === "v" && !hasVar(st.right)) || (st.right.k === "v" && !hasVar(st.left)));
const showR = (r: R) => (r.d === 1n ? `${r.n}` : `${r.n}/${r.d}`);

export function assessChain(statement: string, texts: string[]): ChainVerdict {
  const s = new DerivationSession(statement); const lines: LineVerdict[] = [];
  const task = s.task;
  const tr: TransitionEvidence[] = texts.map((_, i) => ({ line: i, status: "unsupported", relation: null, reason: "", counterexample: null, move: null, certificate: null }));
  // notation@1: an ambiguous line is never read, so it is neither refuted nor certified
  const amb = texts.map((t) => ambiguousNotation(t));
  amb.forEach((a, i) => { if (a) tr[i].reason = "ambiguous-notation"; });
  // 1. validity of every transition on its own (independent of authorization): a false closed equality, or a line that loses a solution of the line before
  for (let i = 0; i < texts.length; i++) { if (amb[i]) continue; const ss = splitSides(texts[i]); const ts = ss?.map((x) => parseTree(x)); if (ts && ts.every((x) => x)) for (let j = 1; j < ts.length; j++) { const a = evalTree(ts[j - 1]!), b = evalTree(ts[j]!); if (a && b && !same(a, b) && (task?.mode ?? "expression") === "expression") { tr[i].status = "invalid"; tr[i].reason = "mathematically-false"; tr[i].counterexample = { lost: null, gained: null }; break; } } }
  // expressions (@3): each expression must equal the one before it as a rational function of the single variable (exact); a difference is shown at a
  // rational point of the domain where both are defined
  if (task && task.mode === "expression" && task.trees.length === 1) {
    const binds = task.bindings && Object.keys(task.bindings).length ? task.bindings : null;
    const bound = (t: Tree) => (binds ? substituteVars(t, binds) : t);
    const v0 = variableOf(task.trees.map(bound));
    const exprDom = v0 ? domainOf(v0, task.conditions.map(parseCondition).filter((x): x is NonNullable<ReturnType<typeof parseCondition>> => !!x), []) : null;
    const okAt = (x: R) => !exprDom || ((!exprDom.lower || (exprDom.lower.strict ? x.n * exprDom.lower.at.d > exprDom.lower.at.n * x.d : x.n * exprDom.lower.at.d >= exprDom.lower.at.n * x.d)) && (!exprDom.upper || (exprDom.upper.strict ? x.n * exprDom.upper.at.d < exprDom.upper.at.n * x.d : x.n * exprDom.upper.at.d <= exprDom.upper.at.n * x.d)) && !exprDom.excluded.some((e) => e.n === x.n && e.d === x.d));
    let prevT: Tree = task.trees[0];
    for (let i = 0; i < texts.length && v0 !== null; i++) {
      if (amb[i]) break;
      const ss = splitSides(texts[i]); const ts = ss?.map((x) => parseTree(x)); if (!ts || ts.some((x) => !x)) break;
      const seq = (ts as Tree[]).map((t) => (task.defined && t.k === "v" && t.name === task.defined ? prevT : t));
      const chain = seq.length === 1 ? [prevT, seq[0]] : seq;
      for (let j = 1; j < chain.length && tr[i].status !== "invalid"; j++) {
        const a = bound(chain[j - 1]), b = bound(chain[j]); const v = variableOf([a, b]); if (v === null) continue;
        const eq = v === "" ? (() => { const x = evalTree(a), y = evalTree(b); return x && y ? same(x, y) : null; })() : sameRational(a, b, v);
        if (eq === false) {
          let at: string | null = null;
          if (v) for (let k = 0; k <= 40 && !at; k++) { const x = mk(BigInt(k % 2 ? -(k + 1) / 2 : k / 2), 1n); if (!okAt(x)) continue; const ea = evalTree(substituteVars(a, { [v]: showR(x) })), eb = evalTree(substituteVars(b, { [v]: showR(x) })); if (ea && eb && !same(ea, eb)) at = `${v} = ${showR(x)}: ${showR(ea)} vs ${showR(eb)}`; }
          tr[i].status = "invalid"; tr[i].reason = `not-equal: ${show(chain[j - 1])} and ${show(chain[j])} differ${at ? ` (at ${at})` : ""}`; tr[i].counterexample = { lost: at, gained: null };
        }
      }
      prevT = seq[seq.length - 1];
    }
  }
  if (task && task.mode !== "expression" && task.domain && task.trees.length === 2) {
    let prev: Statement | null = { left: task.trees[0], rel: task.rel ?? "=", right: task.trees[1] }; let prevClaimOutside = false;
    for (let i = 0; i < texts.length; i++) {
      const cur = amb[i] ? null : statementOf(task, texts[i]); if (!cur) { prev = null; tr[i].reason ||= "outside-solution-set-surface"; continue; }
      const isFinal = i === texts.length - 1;
      // the FINAL claim may not include a value outside the domain (an intermediate candidate list may, if a later line discards it)
      const outside = cur.claim?.find((x) => !rationalSolutionSet({ left: parseTree(task.domain!.v)!, rel: "=", right: parseTree(showR(x))! }, task.domain!)?.length);
      if (isFinal && cur.claim && outside && tr[i].status !== "invalid" && !tr.slice(0, i).some((t) => t.status === "invalid")) { tr[i].status = "invalid"; tr[i].reason = `excluded-value: ${task.domain.v} = ${showR(outside)} is outside the domain (${[...task.conditions, ...(task.natural ?? [])].join(", ")})`; }
      if (prev) { const c = compareStatements(prev, cur.st, task.domain); if (c) { tr[i].relation = c.relation; if (c.lost || c.gained) tr[i].counterexample = { lost: c.lost, gained: c.gained };
        const approx = c.lost && cur.claim && prev.rel === "=" && approximatesAllRoots(prev, task.domain, cur.claim.map((x) => ({ n: x.n, d: x.d })));
        // after an implication-only step (or candidates listed before the domain was applied), dropping a candidate is legitimate exactly when no
        // solution of the TASK is dropped: the task must imply this line
        const candidateMode = tr.slice(0, i).some((t) => t.relation === "implies" || t.relation === "neither") || (cur.claim !== null && prevClaimOutside);
        const rejects = c.lost && candidateMode && (() => { const k = compareStatements({ left: task.trees[0], rel: task.rel ?? "=", right: task.trees[1] }, cur.st, task.domain!); return !!k && !k.lost; })();
        if (rejects && tr[i].status !== "invalid") tr[i].reason = "discards-candidates: every dropped candidate fails the task";
        else if (!c.lost && c.gained && (prev.rel !== "=" || cur.st.rel !== "=") && tr[i].status !== "invalid") { tr[i].status = "invalid"; tr[i].reason = `changes-solution-set: ${task.domain.v} ${c.gained.kind === "exact" ? `= ${c.gained.value}` : `in (${c.gained.low}, ${c.gained.high}]`} satisfies this inequality but not the one before (an inequality step must be an equivalence)`; }
        else if (approx && tr[i].status !== "invalid") tr[i].reason = "approximate-values: decimal roundings of every (irrational) root; whether an approximation is acceptable is a marking decision";
        else if (c.lost && tr[i].status !== "invalid") { tr[i].status = "invalid"; tr[i].reason = `loses-solution: ${task.domain.v} ${c.lost.kind === "exact" ? `= ${c.lost.value}` : `in (${c.lost.low}, ${c.lost.high}]`} satisfies the line before but not this one`; } } }
      // after an implication-only step (candidates gained), a FINAL claim that keeps a candidate which does not solve the TASK is false
      // (only when no earlier line is invalid: a claim that merely follows from an earlier error is not itself the error)
      if (isFinal && cur.claim && task.mode === "equation" && tr[i].status !== "invalid" && tr.slice(0, i).some((t) => t.relation === "implies" || t.relation === "neither") && !tr.slice(0, i).some((t) => t.status === "invalid")) {
        const target = rationalSolutionSet({ left: task.trees[0], rel: "=", right: task.trees[1] }, task.domain);
        const extra = target && cur.claim.find((x) => !target.some((y) => same(mk(y.n, y.d), x)));
        if (extra) { tr[i].status = "invalid"; tr[i].reason = `keeps-extraneous: ${task.domain.v} = ${showR(extra)} came from an implication-only step and does not solve the task`; }
      }
      prevClaimOutside = !!(cur.claim && outside);
      prev = cur.st;
    }
  }
  // 2. authorization, line by line (a refused line is not added to the chain; later lines are then not certified)
  let stopped = false;
  for (let i = 0; i < texts.length; i++) {
    if (stopped) { if (tr[i].status !== "invalid") tr[i].reason ||= "after-uncertified-line"; continue; }
    const v = s.append(texts[i]); lines.push(v);
    if (v.authorized && tr[i].status !== "invalid") { const k = v.certificate?.move.kind ?? v.reason; tr[i].status = k.startsWith("implication:") ? "certified-implication" : k === "check-candidates" || k === "candidates-before-domain" ? "certified-candidate-check" : task?.mode === "expression" ? "certified-rewrite" : "certified-equivalence"; tr[i].reason = k; tr[i].move = k; tr[i].certificate = v.certificate?.digest ?? null; }
    else { if (v.valid === false && tr[i].status !== "invalid") { tr[i].status = "invalid"; tr[i].reason = v.reason; } else if (tr[i].status !== "invalid") tr[i].reason = v.reason; if (!v.authorized) stopped = true; }
  }
  const firstInvalid = tr.findIndex((t) => t.status === "invalid");
  const firstUnauth = lines.findIndex((l) => !l.authorized);
  // 3. completeness and the final answer, judged on their own
  let completeness: WorkingEvidence["completeness"] = texts.length ? "incomplete" : "no-working";
  let finalAnswer: WorkingEvidence["finalAnswer"] = { present: false, correct: null, claimed: null, reason: texts.length ? "no final answer stated" : "no working" };
  if (task && texts.length) {
    const last = texts[texts.length - 1];
    if (task.mode !== "expression" && task.domain && task.trees.length === 2) {
      const cur = statementOf(task, last);
      if (cur && solvedForm(cur.st, cur.claim)) {
        completeness = "complete";
        const taskSt: Statement = { left: task.trees[0], rel: task.rel ?? "=", right: task.trees[1] };
        if (cur.claim && task.mode === "equation") { const target = rationalSolutionSet(taskSt, task.domain); const cl = cur.claim; finalAnswer = { present: true, claimed: strip(last), correct: target ? cl.length === target.length && cl.every((x) => target.some((y) => same(mk(y.n, y.d), x))) : null, reason: target ? "compared with the exact solution set of the task" : "the task's solution set is not finite-rational: not decided" }; }
        else { const c = compareStatements(taskSt, cur.st, task.domain); finalAnswer = { present: true, claimed: strip(last), correct: c ? c.relation === "equivalent" : null, reason: c ? "compared with the exact solution set of the task" : "not decided" }; }
      }
    } else if (task.mode === "expression") {
      const ss = splitSides(last); const lt = ss ? parseTree(ss[ss.length - 1]) : null;
      if (lt) {
        const bound = (t: Tree) => (task.bindings && Object.keys(task.bindings).length ? substituteVars(t, task.bindings) : t);
        const a = evalTree(bound(task.trees[0])), b = evalTree(bound(lt));
        const simplified = !hasVar(lt) ? (isAtomT(lt) || isNegAtom(lt)) : isExpandedCollected(lt) || isFactored(lt) || lowestTermsQuotient(lt);
        completeness = simplified ? "complete" : "incomplete";
        if (simplified) finalAnswer = { present: true, claimed: show(lt), correct: a && b ? same(a, b) : (() => { const k = checkSymbolicStep(toExpr(task.trees[0]), toExpr(lt), task.assumptions); return k.ok ? true : k.outcome === "invalid" ? false : null; })(), reason: "compared with the task expression" };
      }
    }
  }
  const status: ChainVerdict["status"] = firstInvalid >= 0 && (firstUnauth < 0 || firstInvalid <= firstUnauth || true) ? "invalid" : firstUnauth >= 0 ? "unsupported" : texts.length ? "verified" : "unsupported";
  const at = status === "invalid" ? firstInvalid : status === "unsupported" ? (firstUnauth >= 0 ? firstUnauth : null) : null;
  const reason = status === "invalid" ? tr[firstInvalid].reason : status === "unsupported" ? (firstUnauth >= 0 ? lines[firstUnauth].reason : "no-working") : "all-lines-authorized";
  const evidence: WorkingEvidence = {
    contract: WORKING_EVIDENCE_CONTRACT, versions: { authority: AUTHORITY_VERSION, solutionSets: SOLUTION_SETS_VERSION },
    task: { mode: task?.mode ?? null, conditions: task?.conditions ?? [], domain: task?.natural ?? [] },
    transitions: tr, firstInvalid: firstInvalid >= 0 ? firstInvalid : null,
    method: !texts.length ? "no-working" : firstInvalid >= 0 ? "invalid" : tr.every((t) => t.status.startsWith("certified")) ? "certified" : "unsupported",
    completeness, finalAnswer, progress: tr.filter((t) => t.status.startsWith("certified")).map((t) => t.move ?? t.status),
  };
  return { status, at, reason, lines, chain: status === "verified" ? s.chain : status === "invalid" ? [] : s.chain, evidence };
}

// ------------------------------------------------------------------------------------------------ route policy
/**
 * FINAL POLICY: the authority is the ONLY thing that can authorize a derivation. There is no fallback. Two kinds of refusal are kept apart so reports and users can tell them apart:
 *   - unjustified:  the line is in the authority's surface and no registered, replayable justification explains it (neutral element, arbitrary parameter, missing assumption, ...);
 *   - unrecognized: the line / task is outside the authority's surface (unparsed text, systems, radicals, logarithms, inequalities, symbol chains): nothing is claimed about its truth.
 * Neither is "invalid" (that is the validity judgment, made elsewhere) and neither is verified.
 */
export const OUTSIDE_SURFACE = new Set(["task-unparsed", "task-condition-unparsed", "line-unparsed", "equation-shape", "no-registered-equation-move"]);
export type RouteDecision = { kind: "authorized"; verdict: LineVerdict } | { kind: "refused"; verdict: LineVerdict; unrecognized: boolean };
export const ROUTE_STATS = { authorized: 0, refusedUnjustified: 0, refusedUnrecognized: 0 };
export function routeDecision(session: DerivationSession, text: string): RouteDecision {
  const v = session.append(text);
  if (v.authorized) { ROUTE_STATS.authorized++; return { kind: "authorized", verdict: v }; }
  const unrecognized = OUTSIDE_SURFACE.has(v.reason); if (unrecognized) ROUTE_STATS.refusedUnrecognized++; else ROUTE_STATS.refusedUnjustified++;
  return { kind: "refused", verdict: v, unrecognized };
}
/** a decision for text the route cannot even hand to the authority (a symbol chain of a data model it does not know): refused as unrecognized, never authorized */
export function unrecognizedDecision(reason: string): RouteDecision { ROUTE_STATS.refusedUnrecognized++; return { kind: "refused", unrecognized: true, verdict: { line: -1, valid: null, authorized: false, reason, grades: [], certificate: null } }; }
/** a line that is a chain of closed numeric expressions only (the authority's exact-arithmetic surface for routes whose symbols belong to a data model it does not know) */
export function isClosedNumericLine(text: string): boolean { const ss = splitSides(text); return !!ss && ss.every((x) => { const t = parseTree(x); return !!t && !hasVar(t); }); }
