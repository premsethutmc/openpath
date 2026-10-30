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

export const AUTHORITY_VERSION = "openpath-derivation-authority@1" as const;
export const DERIVATION_CERTIFICATE_VERSION = "openpath-derivation-certificate@2" as const;
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
const strip = (s: string) => s.replace(/[−–—]/g, "-").replace(/[×·⋅]/g, "*").replace(/÷/g, "/");
const tz = (r: R | null) => { if (!r || r.d !== 1n || r.n === 0n) return 0; let k = 0, x = r.n < 0n ? -r.n : r.n; while (x % 10n === 0n) { x /= 10n; k++; } return k; };
const gcd = (a: bigint, b: bigint) => { a = a < 0n ? -a : a; while (b) [a, b] = [b, a % b]; return a || 1n; };
const terms = (t: Tree, s = 1n): R[] => t.k === "b" && (t.op === "+" || t.op === "-") ? [...terms(t.l, s), ...terms(t.r, t.op === "+" ? s : -s)] : (() => { const v = evalTree(t); return v ? [mk(s * v.n, v.d)] : []; })();
const numeralKeys = (t: Tree): string[] => t.k === "n" ? (t.u ? [] : [`${mk((t.v as any).n, (t.v as any).d).n < 0n ? -mk((t.v as any).n, (t.v as any).d).n : mk((t.v as any).n, (t.v as any).d).n}/${mk((t.v as any).n, (t.v as any).d).d}`]) : t.k === "v" ? [] : [...numeralKeys(t.l), ...numeralKeys(t.r)];
const denomsOf = (t: Tree): bigint[] => isFrac(t) ? [(t as any).r.v.n] : t.k === "b" ? [...denomsOf(t.l), ...denomsOf(t.r)] : [];
const pt = (s: string): { t: Tree; sg: 1 | -1 } | null => { const neg = s.startsWith("~("); const t = parseTree(neg ? s.slice(2, -1) : s); return t && { t, sg: neg ? -1 : 1 }; };

// ------------------------------------------------------------------------------------------------ task identity
export interface TaskContext { statement: string; sides: string[]; trees: Tree[]; conditions: string[]; assumptions: SymbolicAssumption[]; numerals: ReadonlySet<string>; denominators: bigint[]; mode: "expression" | "equation"; digest: string }
export type TaskResult = { ok: true; task: TaskContext } | { ok: false; reason: string };
const VERB = /^(compute|evaluate|work out|find the value of|calculate|solve|simplify|expand|factorise|factorize|factor|reduce|what is)\s+/i;
const V = (name: string): Expr => ({ kind: "variable", name } as Expr);
function parseCondition(c: string): { text: string; a: SymbolicAssumption } | null {
  const m = /^\s*([A-Za-z])\s*(?:(≠|!=|=\/=)\s*(-?\d+(?:\.\d+)?)|(>|≥|>=)\s*(-?\d+(?:\.\d+)?))\s*$/.exec(c.replace(/\bnot equal to\b/i, "≠"));
  if (!m) return null;
  const x = V(m[1]);
  if (m[2]) { const k = Number(m[3]); const e = k === 0 ? x : ({ kind: "add", terms: [x, { kind: "constant", value: String(-k) }] } as Expr); return { text: c.trim(), a: { kind: "nonzero", expression: e } }; }
  if (Number(m[5]) !== 0) return null;
  return { text: c.trim(), a: { kind: m[4] === ">" ? "positive" : "nonnegative", expression: x } };
}
/** the ONLY wrapper handling. Everything else fails closed with a reason. Declared conditions become carried assumptions; an unparseable condition refuses the task. */
export function normalizeTask(statement: string, extraNumerals: readonly string[] = []): TaskResult {
  let s = strip(String(statement ?? "")).trim().replace(/[.?]+$/, "").trim();
  const conds: string[] = [];
  const m = /\s*(?:,|\bfor\b|\bwhere\b|\bassuming\b|\bwith\b)\s+([A-Za-z]\s*(?:≠|!=|>=|≥|>)[^,]*(?:,\s*[A-Za-z]\s*(?:≠|!=|>=|≥|>)[^,]*)*)$/i.exec(s);
  if (m) { conds.push(...m[1].split(",")); s = s.slice(0, m.index); }
  s = s.replace(VERB, "").trim().replace(/=\s*$/, "").trim();
  const parsed = conds.map(parseCondition); if (parsed.some((p) => !p)) return { ok: false, reason: "task-condition-unparsed" };
  if (/[A-Za-z]{3,}|\b(?:ln|pi|or|if)\b|[A-Za-z]+\s+[A-Za-z]+/i.test(s)) return { ok: false, reason: "task-unparsed" };   // words are not algebra: "a thing happened" must not parse as a product of letters
  const sides = s.split("=").map((x) => x.trim()); if (!s || sides.length > 2) return { ok: false, reason: "task-unparsed" };
  const trees = sides.map((x) => parseTree(x)); if (trees.some((t) => !t)) return { ok: false, reason: "task-unparsed" };
  const T = trees as Tree[]; const mode = sides.length === 2 && T.some(hasVar) ? "equation" : sides.length === 1 ? "expression" : null;
  if (!mode) return { ok: false, reason: "task-unparsed" };
  const conditions = (parsed as { text: string }[]).map((p) => p.text), assumptions = (parsed as { a: SymbolicAssumption }[]).map((p) => p.a);
  const body = { v: AUTHORITY_VERSION, sides: T.map(canon), conditions, extra: [...extraNumerals].sort() };
  return { ok: true, task: { statement, sides: T.map((t) => show(t)), trees: T, conditions, assumptions, numerals: new Set([...T.flatMap(numeralKeys), ...extraNumerals.flatMap((x) => { const t = parseTree(String(x)); return t ? numeralKeys(t) : []; })]), denominators: T.flatMap(denomsOf), mode, digest: sha256Hex(JSON.stringify(body)) } };
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
  if (["evaluate", "evaluate-product", "distribute", "distribute-unevaluated", "fraction-multiply", "fraction-divide", "fraction-combine", "fraction-chain", "fraction-regroup", "sign-product", "distribute-split"].includes(s.rule)) return "determined";
  const taskOrigin = (x: { t: Tree; sg: 1 | -1 }) => { const v = sv(x); return !!v && cx.numerals.has(`${v.n < 0n ? -v.n : v.n}/${v.d}`); };
  if (s.rule === "split-additive") {
    const v = sv(S[0]), ps = Rp.map(sv); if (v && ps.every((p) => p) && groupedPV(v, ps as R[])) return "determined";
    if (v && ps.every((p) => p) && groupedUnits(S[0].t, Rp.map((x) => x.t))) return "determined";                  // 3/4 = 1/4 + 2/4: a grouping of the unit fractions that make the numeral
    if (!taskOrigin(S[0]) || !v) return "parametric";
    const partition = ps.every((p) => p && (p.n < 0n) === (v.n < 0n) && (p.n < 0n ? -p.n : p.n) * v.d < (v.n < 0n ? -v.n : v.n) * p.d);   // a real PARTITION of the source: same sign, each piece smaller (not 32 = 109 + (-77))
    const sib = (p: R) => cx.siblings.some((q) => { const t = mk(p.n * q.d + q.n * p.d, p.d * q.d); return (t.n === 0n && partition) || tz(t) > Math.max(tz(p), tz(q)) || (tz(t) >= 1 && tz(p) === 0 && tz(q) === 0); });   // NOT "cancels a sibling": 77 + 32 = 77 + (109 - 77) re-expresses the answer (found by the held-out corpus)
    return Rp.some((x) => { const p = sv(x); return p && tz(p) >= 1 && tz(p) > tz(v); }) || (ps as R[]).some(sib) ? "anchored" : "parametric";
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
  const normalizing = (polyShape(r) && (isExpandedCollected(r) || isExpandedCollected(l) || r.k === "b" && r.op === "/")) || noGrowth(l, r);
  const hidden = hasFlattenedPureNumber(r);
  if (!normalizing || hidden || (kl !== null && kr !== null && kl !== kr && !task.assumptions.length && false)) return { ok: false, why: hidden ? "hidden-number-computation" : "no-registered-rewrite", grades: [] };
  return { ok: true, why: "polynomial-normalization", part: part(sv2.used.length ? "rational-simplification" : "polynomial-normalization", "determined", null, sv2.certificate, sv2.used), grades: ["determined"] };
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

// ---- equation moves
const sumOf = (ts: { n: Tree; s: number }[]): Tree => ts.length === 0 ? parseTree("0")! : ts.map((t) => (t.s < 0 ? ({ k: "b", op: "-", l: { k: "n", v: (parseTree("0") as any).v, u: true }, r: t.n } as Tree) : t.n)).reduce((x, y) => (y.k === "b" && y.op === "-" && y.l.k === "n" && (y.l as any).u ? ({ k: "b", op: "-", l: x, r: y.r } as Tree) : ({ k: "b", op: "+", l: x, r: y } as Tree)));
const bin = (op: "+" | "-" | "*" | "/", l: Tree, r: Tree): Tree => ({ k: "b", op, l, r });
function equationMove(task: TaskContext, P: Tree[], N: Tree[]): { ok: boolean; why: string; kind: string; parameter: string | null; parts: PartCertificate[]; grades: Grade[] } {
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
    const m = N.map((n, i) => n.k === "b" && n.op === op && canon(n.l) === canon(P[i]) ? n.r : null);
    if (m[0] && m[1] && canon(m[0]) === canon(m[1]) && !hasVar(m[0]) && evalTree(m[0]) && (op === "+" || op === "-" || !evalTree(m[0])!.n === false && evalTree(m[0])!.n !== 0n)) return done("balance", op + show(m[0]), []);
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
    for (let k = 0; k < ts.length && ts.length > 1; k++) if (!hasVar(ts[k].n) ? !!evalTree(ts[k].n) : monomial(ts[k].n) !== null) {   // a closed term or a monomial moves across the equals sign
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
  // the equation rewritten as a polynomial identity: both sides normalised, nothing hidden (checked by the sides' own authorization above); anything else is refused
  return fail("no-registered-equation-move");
}

// ------------------------------------------------------------------------------------------------ the derivation session (one task, an ordered chain of lines)
export interface LineVerdict { line: number; valid: boolean | null; authorized: boolean; reason: string; grades: Grade[]; certificate: DerivationCertificate | null }
const splitSides = (text: string): string[] | null => { const t = strip(text); if (/[A-Za-z]{3,}|\b(?:ln|pi|or|if)\b|[A-Za-z]+\s+[A-Za-z]+/i.test(t)) return null; if (/[<>≤≥≠]|!=/.test(t) || /\s(or|and)\s|[;]/i.test(t)) return null; const s = t.split("=").map((x) => x.trim()); return s.length >= 1 && s.every(Boolean) ? s : null; };
export class DerivationSession {
  readonly task: TaskContext | null; readonly failure: string | null;
  readonly chain: DerivationCertificate[] = [];
  private pool: Tree[]; private last: Tree[];
  constructor(statement: string, readonly extraNumerals: readonly string[] = []) {
    const t = normalizeTask(statement, extraNumerals);
    this.task = t.ok ? t.task : null; this.failure = t.ok ? null : t.reason;
    this.pool = this.task ? [...this.task.trees] : []; this.last = this.task ? [...this.task.trees] : [];
  }
  /** make an earlier ACCEPTED expression visible (a line a route verified before this chain began). It carries no certificate and authorizes nothing by itself. */
  adopt(text: string): void { const ss = splitSides(text); if (!ss) return; for (const x of ss) { const t = parseTree(x); if (t) this.pool.push(t); } }
  /** judge one line against the task and the lines accepted so far. A refused line is NOT added to the chain (later lines cannot depend on it). */
  append(text: string): LineVerdict {
    const line = this.chain.length;
    const out = (authorized: boolean, reason: string, valid: boolean | null, grades: Grade[] = [], certificate: DerivationCertificate | null = null): LineVerdict => ({ line, valid, authorized, reason, grades, certificate });
    if (!this.task) return out(false, this.failure ?? "task-unparsed", null);
    const task = this.task, ss = splitSides(text); if (!ss) return out(false, "line-unparsed", null);
    const T = ss.map((x) => parseTree(x)); if (T.some((t) => !t)) return out(false, "line-unparsed", null);
    const sides = T as Tree[];
    const seen = (t: Tree) => this.pool.some((p) => sameUpToFractionRegrouping(p, t));
    const parts: PartCertificate[] = []; const grades: Grade[] = []; let kind = "chain", parameter: string | null = null; let valid: boolean | null = true; const sources: string[] = [];
    if (task.mode === "expression") {
      // validity of every consecutive pair first (exact arithmetic; symbolic pairs by the kernel with the declared assumptions)
      for (let j = 1; j < sides.length; j++) { const a = evalTree(sides[j - 1]), b = evalTree(sides[j]); if (a && b) { if (!same(a, b)) return out(false, "mathematically-false", false); } else if (hasVar(sides[j - 1]) || hasVar(sides[j])) { const k = checkSymbolicStep(toExpr(sides[j - 1]), toExpr(sides[j]), task.assumptions); if (k.outcome === "invalid") return out(false, "mathematically-false", false); if (!k.ok && /^(missing-assumption|domain-restriction-lost)/.test(k.reason)) valid = null; } }
      // the first side must be visible; with ONE side the line restates the previous result
      let from: Tree;
      if (sides.length === 1) { from = this.last[this.last.length - 1]; if (canon(from) !== canon(sides[0])) { const v = authorizeExpr(task, from, sides[0]); if (!v.ok) return out(false, v.why, valid, v.grades); parts.push(v.part!); grades.push(...v.grades); sources.push(canon(from)); this.last = [sides[0]]; this.pool.push(sides[0]); return this.seal(line, task, sources, [canon(sides[0])], parts, "chain", null, grades, valid); } }
      if (!seen(sides[0])) return out(false, "source-not-visible", valid);
      sources.push(canon(sides[0]));
      for (let j = 1; j < sides.length; j++) { const v = authorizeExpr(task, sides[j - 1], sides[j], j); if (!v.ok) return out(false, v.why, valid, v.grades); if (v.part) parts.push(v.part); grades.push(...v.grades); }
    } else {
      if (sides.length !== 2) return out(false, "equation-shape", null);
      const prev = this.last; const m = equationMove(task, prev, sides);
      if (!m.ok) return out(false, m.why, null);
      kind = m.kind; parameter = m.parameter; parts.push(...m.parts); grades.push(...m.grades); valid = null; sources.push(...prev.map(canon));
    }
    return this.sealLine(line, task, sources, sides, parts, kind, parameter, grades, valid);
  }
  private sealLine(line: number, task: TaskContext, sources: string[], sides: Tree[], parts: PartCertificate[], kind: string, parameter: string | null, grades: Grade[], valid: boolean | null): LineVerdict {
    this.last = [...sides]; this.pool.push(...sides);
    return this.seal(line, task, sources, sides.map(canon), parts, kind, parameter, grades, valid);
  }
  private seal(line: number, task: TaskContext, sources: string[], results: string[], parts: PartCertificate[], kind: string, parameter: string | null, grades: Grade[], valid: boolean | null): LineVerdict {
    const prior = this.chain[this.chain.length - 1];
    const body: Omit<DerivationCertificate, "digest"> = { version: DERIVATION_CERTIFICATE_VERSION, task: { digest: task.digest, conditions: task.conditions }, line, sources, results, parts, move: { kind, parameter }, assumptions: [...new Set(parts.flatMap((p) => p.assumptions.map(aKey)))], domainConditions: [...new Set(parts.flatMap((p) => [...(p.rewrite?.restrictions ?? []), ...(p.kernel?.restrictions ?? [])]))], dependencies: prior ? [{ line: prior.line, digest: prior.digest }] : [], versions: { authority: AUTHORITY_VERSION, registry: REWRITE_REGISTRY_VERSION, kernel: KERNEL_VERSION } };
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
      else if (!p.rewrite && p.rule !== "identity" && p.rule !== "representation") return bad("a part carries no evidence", i);
    }
    // finally the whole line is re-authorized from scratch and must reproduce the certificate (same moves, same results)
    const v = s.append(texts[i]); if (!v.authorized || !v.certificate) return bad("re-authorization refused: " + v.reason, i);
    if (v.certificate.digest !== digest) return bad("re-authorization produced a different certificate", i);
  }
  return { ok: true, reason: "replayed: every line re-authorized in the original task context", at: null };
}

/** convenience: judge a whole chain; the first false line is `invalid` even when an earlier line is unauthorized */
export interface ChainVerdict { status: "verified" | "invalid" | "unsupported"; at: number | null; reason: string; lines: LineVerdict[]; chain: DerivationCertificate[] }
export function assessChain(statement: string, texts: string[]): ChainVerdict {
  const s = new DerivationSession(statement); const lines: LineVerdict[] = [];
  // validity first: scan for a false closed equality anywhere before authorizing
  for (let i = 0; i < texts.length; i++) { const ss = splitSides(texts[i]); const ts = ss?.map((x) => parseTree(x)); if (ts && ts.every((x) => x)) for (let j = 1; j < ts.length; j++) { const a = evalTree(ts[j - 1]!), b = evalTree(ts[j]!); if (a && b && !same(a, b) && (s.task?.mode ?? "expression") === "expression") return { status: "invalid", at: i, reason: "mathematically-false", lines, chain: [] }; } }
  for (let i = 0; i < texts.length; i++) { const v = s.append(texts[i]); lines.push(v); if (!v.authorized) return { status: v.valid === false ? "invalid" : "unsupported", at: i, reason: v.reason, lines, chain: s.chain }; }
  return { status: texts.length ? "verified" : "unsupported", at: null, reason: texts.length ? "all-lines-authorized" : "no-working", lines, chain: s.chain };
}

// ------------------------------------------------------------------------------------------------ route policy
/**
 * Reasons that mean "the authority's supported surface does not cover this line" (not "the line is unjustified"). A route may then consult its older, STRICTER-than-nothing provenance
 * check, but only (a) after the engine's own parser and independent checker accepted the task and the line, (b) with the structural guards below, and (c) with the use recorded as
 * `surface: "legacy-provenance"`. A DEFINITE refusal (neutral element, hidden computation, arbitrary parameter, missing assumption, ...) is never overridden.
 */
export const OUTSIDE_SURFACE = new Set(["task-unparsed", "task-condition-unparsed", "line-unparsed", "equation-shape", "no-registered-equation-move"]);
export type RouteDecision = { kind: "authorized"; verdict: LineVerdict } | { kind: "refused"; verdict: LineVerdict } | { kind: "outside-surface"; verdict: LineVerdict };
/** Structural guards that hold even outside the surface: a neutral element or a pure-number computation inside a symbolic/equation line is a claim of its own. */
export function surfaceGuard(text: string): string | null {
  const ss = splitSides(text); if (!ss) return null;
  for (const x of ss) { const t = parseTree(x); if (!t) continue; if (neutral(t)) return "neutral-element"; if (hasFlattenedPureNumber(t) && hasVar(t)) return "hidden-number-computation"; }
  return null;
}
/** how often each route decision was taken (observability: the outside-surface count is the amount of working still judged by the older provenance) */
export const ROUTE_STATS = { authorized: 0, refused: 0, outsideSurface: 0 };
export function routeDecision(session: DerivationSession, text: string): RouteDecision {
  const d = routeDecisionInner(session, text); if (d.kind === "authorized") ROUTE_STATS.authorized++; else if (d.kind === "refused") ROUTE_STATS.refused++; else ROUTE_STATS.outsideSurface++; return d;
}
function routeDecisionInner(session: DerivationSession, text: string): RouteDecision {
  const v = session.append(text);
  if (v.authorized) return { kind: "authorized", verdict: v };
  if (OUTSIDE_SURFACE.has(v.reason)) { const g = surfaceGuard(text); return g ? { kind: "refused", verdict: { ...v, reason: g } } : { kind: "outside-surface", verdict: v }; }
  return { kind: "refused", verdict: v };
}
/** a line that is a chain of closed numeric expressions only (the authority's exact-arithmetic surface for routes whose symbols belong to a data model it does not know) */
export function isClosedNumericLine(text: string): boolean { const ss = splitSides(text); return !!ss && ss.every((x) => { const t = parseTree(x); return !!t && !hasVar(t); }); }
