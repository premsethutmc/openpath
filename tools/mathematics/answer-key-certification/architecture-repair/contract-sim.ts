// DESIGN DEMONSTRATOR (not production, imported by nothing): applies the proposed authorization contract to the FROZEN held-out corpus.
// numeric tasks: full verdict from exact rational arithmetic + the (unchanged) registry matcher + the proposed authorization layer.
// symbolic tasks: production verdict (bare-task run) with the contract's strengthening checks overlaid; it never turns a refusal into an acceptance.
// usage: bun contract-sim.ts <P1|P2> <out.json>
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { parseTree, certifyRewrite, canon, isFrac, type Tree } from "../../../../packages/learning/src/rewrite-registry.ts";
const policy = process.argv[2] ?? "P2";
const here = new URL(".", import.meta.url).pathname;
const raw = readFileSync(here + "FROZEN-heldout-corpus.json");
if (createHash("sha256").update(raw).digest("hex") !== readFileSync(here + "FROZEN.sha256", "utf8").split(" ")[0]) throw new Error("frozen corpus modified");
const corpus = JSON.parse(raw.toString()) as any[];
const prod = new Map<string, any>(JSON.parse(readFileSync(here + "../independent-audit/results-new-bare.json", "utf8")).map((x: any) => [x.id, x]));

// ---- exact arithmetic on trees (Q = {n,d} from the registry parser)
type R = { n: bigint; d: bigint };
const mk = (n: bigint, d: bigint): R => { if (d < 0n) { n = -n; d = -d; } let a = n < 0n ? -n : n, b = d; while (b) [a, b] = [b, a % b]; a ||= 1n; return { n: n / a, d: d / a }; };
const ev = (t: Tree): R | null => {
  if (t.k === "n") return mk((t.v as any).n, (t.v as any).d); if (t.k === "v") return null;
  const a = ev(t.l), b = ev(t.r); if (!a || !b) return null;
  if (t.op === "+") return mk(a.n * b.d + b.n * a.d, a.d * b.d); if (t.op === "-") return mk(a.n * b.d - b.n * a.d, a.d * b.d);
  if (t.op === "*") return mk(a.n * b.n, a.d * b.d); if (t.op === "/") return b.n === 0n ? null : mk(a.n * b.d, a.d * b.n);
  if (t.op === "^") { if (b.d !== 1n || b.n < 0n || b.n > 12n) return null; return mk(a.n ** b.n, a.d ** b.n); } return null;
};
const same = (a: R, b: R) => a.n === b.n && a.d === b.d;
const hasVar = (t: Tree): boolean => t.k === "v" || (t.k === "b" && (hasVar(t.l) || hasVar(t.r)));
const isAtomT = (t: Tree) => (t.k === "n" && !t.u) || isFrac(t);
// ---- generic structure checks
const isId = (t: Tree, v: bigint) => t.k === "n" && !t.u && (t.v as any).n === v && (t.v as any).d === 1n;
const neutral = (t: Tree): boolean => t.k === "b" && (neutral(t.l) || neutral(t.r) || ((t.op === "*") && (isId(t.l, 1n) || isId(t.r, 1n))) || ((t.op === "+") && (isId(t.l, 0n) || isId(t.r, 0n))) || ((t.op === "-") && isId(t.r, 0n) && !(t.l.k === "n" && t.l.u)) || ((t.op === "/" || t.op === "^") && isId(t.r, 1n)));
const strip = (s: string) => s.replace(/[−–—]/g, "-").replace(/[×·⋅]/g, "*").replace(/÷/g, "/");
// ---- task normalisation: the ONLY wrapper handling; anything else fails CLOSED with a reason
const VERB = /^(compute|evaluate|work out|find the value of|calculate|solve|simplify|expand|factor|reduce|what is)\s+/i;
function task(statement: string): { expr: string; cond: string | null } | { fail: string } {
  let s = statement.trim().replace(/[.?]+$/, "").trim(); const m = /\s+for\s+(.+)$/i.exec(s); let cond: string | null = null; if (m) { cond = m[1]; s = s.slice(0, m.index); }
  s = s.replace(VERB, "").trim().replace(/=\s*$/, "").trim();
  return s && s.split("=").every((x) => parseTree(strip(x).trim())) ? { expr: s, cond } : { fail: "task-unparsed" };
}
// ---- derivation authorization (grades) -----------------------------------------------------------------------------------------
const tz = (r: R | null) => { if (!r || r.d !== 1n || r.n === 0n) return 0; let k = 0, x = r.n < 0n ? -r.n : r.n; while (x % 10n === 0n) { x /= 10n; k++; } return k; };
function pvParts(r: R): R[] | null { // place-value parts of a (decimal) numeral
  let m = 0, v = r; while (v.d !== 1n && m < 6) { v = mk(v.n * 10n, v.d); m++; } if (v.d !== 1n) return null;
  const neg = v.n < 0n, s = (neg ? -v.n : v.n).toString(), out: R[] = [];
  for (let i = 0; i < s.length; i++) { const dgt = BigInt(s[i]); if (dgt === 0n) continue; const e = s.length - 1 - i - m; const val = e >= 0 ? mk(dgt * 10n ** BigInt(e) * (neg ? -1n : 1n), 1n) : mk(dgt * (neg ? -1n : 1n), 10n ** BigInt(-e)); out.push(val); } return out;
}
function groupedPV(src: R, parts: R[]): boolean { const pv = pvParts(src); if (!pv || pv.length > 8 || parts.length > pv.length) return false; const tot = parts.map(() => mk(0n, 1n));
  const go = (i: number): boolean => { if (i === pv.length) return parts.every((p, j) => same(p, tot[j])); for (let j = 0; j < parts.length; j++) { const old = tot[j]; tot[j] = mk(old.n * pv[i].d + pv[i].n * old.d, old.d * pv[i].d); if (go(i + 1)) return true; tot[j] = old; } return false; }; return go(0); }
const pt = (s: string): { t: Tree; sg: 1 | -1 } | null => { const neg = s.startsWith("-("); const t = parseTree(neg ? s.slice(2, -1) : s); return t && { t, sg: neg ? -1 : 1 }; };
type Grade = "determined" | "anchored" | "parametric";
interface Ctx { siblings: R[]; taskNumerals: Set<string>; fracDens: bigint[] }
const flat = (t: Tree, sg = 1n): R[] => t.k === "b" && (t.op === "+" || t.op === "-") ? [...flat(t.l, sg), ...flat(t.r, t.op === "+" ? sg : -sg)] : (() => { const v = ev(t); return v ? [mk(sg * v.n, v.d)] : []; })();
const numerals = (t: Tree): string[] => t.k === "n" ? (t.u ? [] : [mk((t.v as any).n, (t.v as any).d).n + "/" + mk((t.v as any).n, (t.v as any).d).d]) : t.k === "v" ? [] : [...numerals(t.l), ...numerals(t.r)];
const fracDens = (t: Tree): bigint[] => isFrac(t) ? [(t as any).r.v.n] : t.k === "b" ? [...fracDens(t.l), ...fracDens(t.r)] : [];
function gradeStep(s: any, cx: Ctx): Grade {
  const src = s.source.map(pt), rep = s.replacement.map(pt); if (src.some((x: any) => !x) || rep.some((x: any) => !x)) return "parametric";
  const sv = (x: any) => { const v = ev(x.t); return v && x.sg < 0 ? mk(-v.n, v.d) : v; };
  if (s.rule === "evaluate" || s.rule === "distribute") return "determined";
  // origin: a free-parameter strategy (compensation, shift, regroup) is authorised only on a TASK-ORIGIN term; a derived value may be re-expressed only by determined schemes
  const taskOrigin = (x: any) => { const v = sv(x); return !!v && cx.taskNumerals.has((v.n < 0n ? -v.n : v.n) + "/" + v.d); };
  if (s.rule === "split-additive") { const v = sv(src[0]), ps = rep.map(sv); if (v && ps.every((p: any) => p) && groupedPV(v, ps as R[])) return "determined"; if (!taskOrigin(src[0])) return "parametric";
    const sib = (p: R) => cx.siblings.some((q) => { const t = mk(p.n * q.d + q.n * p.d, p.d * q.d); return t.n === 0n || tz(t) > Math.max(tz(p), tz(q)) || tz(t) > 0 && tz(t) >= 1 && (tz(p) === 0 && tz(q) === 0); });
    if (v && (rep.some((x: any) => { const p = sv(x); return p && tz(p) >= 1 && tz(p) > tz(v); }) || (ps as R[]).some(sib))) return "anchored"; return "parametric"; }
  if (s.rule === "split-multiplicative") { if (!taskOrigin(src[0])) return "parametric"; const ps = rep.map(sv) as R[]; return ps.some((p, i) => ps.some((q, j) => i !== j && p && q && tz(mk(p.n * q.n, p.d * q.d)) > Math.max(tz(p), tz(q)))) ? "anchored" : "parametric"; }
  if (s.rule === "fraction-scale") { const a = src[0].t as any, b = rep[0].t as any; const lowest = (f: any) => { let x = f.l.v.n < 0n ? -f.l.v.n : f.l.v.n, y = f.r.v.n; while (y) [x, y] = [y, x % y]; return x === 1n; };
    if (isFrac(b) && lowest(b)) return "determined"; const den = (b as any).r.v.n as bigint; const lcm = cx.fracDens.reduce((a, d) => (a * d) / (() => { let x = a, y = d; while (y) [x, y] = [y, x % y]; return x; })(), 1n); return isFrac(b) && (cx.fracDens.includes(den) || den === lcm) ? "determined" : "parametric"; }
  if (s.rule === "shifted-transfer") { const o = src.map(sv) as R[]; return rep.some((x: any, i: number) => { const v = sv(x); return v && o.some((q) => !same(q, v) && tz(v) > tz(q) && tz(v) >= 1); }) ? "anchored" : "parametric"; }
  return "parametric";
}
function cyclic(c: any): boolean { const key = (s: any) => s.path.join("/") + "|" + s.ctx; const g = new Map<string, any[]>(); for (const s of c.steps) g.set(key(s), [...(g.get(key(s)) ?? []), s]);
  for (const ss of g.values()) for (const s of ss) { const others = ss.filter((o) => o !== s).flatMap((o) => o.source); if (s.replacement.some((r: string) => others.includes(r))) return true; } return false; }
type V = { v: "verified" | "invalid" | "unsupported"; at?: number; why: string; grades?: Grade[] };
const lowestT = (f: any) => { let x = f.l.v.n < 0n ? -f.l.v.n : f.l.v.n, y = f.r.v.n; while (y) [x, y] = [y, x % y]; return x === 1n; };
let TASKN = new Set<string>(), TASKT: Tree; 
function authorize(l: Tree, r: Tree): { ok: boolean; why: string; grades: Grade[] } {
  if (canon(l) === canon(r)) return { ok: true, why: "identity", grades: [] };
  if (isAtomT(l) && isAtomT(r) && ev(l) && ev(r) && same(ev(l)!, ev(r)!) && (r.k === "n" || isFrac(r) && lowestT(r))) return { ok: true, why: "representation", grades: ["determined"] };
  const c = certifyRewrite(l, r); if (!c) return { ok: false, why: neutral(r) && !neutral(l) ? "neutral-element" : "no-registered-rewrite", grades: [] };
  if (cyclic(c)) return { ok: false, why: "cyclic-dependency", grades: [] };
  const cx: Ctx = { siblings: flat(l), taskNumerals: TASKN, fracDens: fracDens(TASKT) }; const grades = c.steps.map((s: any) => gradeStep(s, cx)); if (policy === "P2" && grades.includes("parametric")) return { ok: false, why: "arbitrary-parameter", grades };
  return { ok: true, why: grades.includes("parametric") ? "parametric-authorised(advisory)" : "authorised", grades };
}
function judge(c: any): V {
  const t = task(c.statement); if ("fail" in t) return { v: "unsupported", why: t.fail };
  if (t.cond) return { v: "unsupported", why: "assumption-without-carrier" };
  const T = t.expr.split("=").map((x) => parseTree(strip(x).trim())!); const symbolic = T.some(hasVar);
  if (symbolic) { // overlay on the production verdict: strengthening only
    const base = prod.get(c.id); if (base.got !== "verified") return { v: base.got === "invalid" ? "invalid" : "unsupported", at: base.gotInvalid ?? undefined, why: "production" };
    let prev = T; for (let i = 0; i < c.lines.length; i++) { const sides = strip(c.lines[i]).split("=").map((x) => parseTree(x.trim())); if (sides.some((x) => !x)) return { v: "unsupported", why: "unparsed-line", at: i };
      if (sides.some((x) => neutral(x!))) { if (!prev.some(neutral)) return { v: "unsupported", why: "neutral-element", at: i }; }
      sides.forEach((s, k) => { void s; void k; });
      const bal = (j: number) => { const n = sides[j]!; return n.k === "b" && ["+", "-", "*", "/"].includes(n.op) && n.r.k === "n" && prev[j] && canon(n.l) === canon(prev[j]) ? n.op + canon(n.r) : null; };
      if (sides.length === 2 && prev.length === 2 && bal(0) && bal(0) === bal(1)) { prev = sides as Tree[]; continue; } // balance: the same operation and parameter shown on both sides
      const closedSides = sides.map((x, k) => ({ x: x!, k })).filter((o) => !hasVar(o.x) && !isAtomT(o.x) && ev(o.x));
      const othersUnchanged = (k: number) => sides.length === prev.length && sides.every((x, j) => j === k || canon(x!) === canon(prev[j])); // a closed side re-expressed while the rest of the equation is untouched is a derivation of that side; otherwise it is an equation-level move judged by the production checker
      for (const o of closedSides.filter((o) => othersUnchanged(o.k))) { const p = prev[Math.min(o.k, prev.length - 1)]; if (p && canon(p) !== canon(o.x)) { const a = authorize(p, o.x); if (!a.ok && !(ev(p) && same(ev(p)!, ev(o.x)!) && false)) return { v: "unsupported", why: a.why + "(equation side)", at: i }; } }
      prev = sides as Tree[]; }
    return { v: "verified", why: "production+overlay" };
  }
  // validity is judged FIRST and independently of authorisation: a false line anywhere is invalid at the first false line
  for (let i = 0; i < c.lines.length; i++) { const sd = strip(c.lines[i]).split("=").map((x) => parseTree(x.trim())); if (sd.length === 2 && sd[0] && sd[1]) { const p = ev(sd[0]), q = ev(sd[1]); if (p && q && !same(p, q)) return { v: "invalid", at: i, why: "false-equality" }; } }
  TASKN = new Set(numerals(T[0])); TASKT = T[0]; let vis: Tree = T[0]; const grades: Grade[] = [];
  for (let i = 0; i < c.lines.length; i++) {
    const sides = strip(c.lines[i]).split("=").map((x) => parseTree(x.trim())); if (sides.length !== 2 || sides.some((x) => !x)) return { v: "unsupported", why: "unparsed-line", at: i };
    const [l, r] = sides as Tree[]; const a = ev(l), b = ev(r);
    if (!a || !b) { const p = prod.get(c.id); return p.got === "invalid" ? { v: "invalid", at: p.gotInvalid, why: "production" } : { v: "unsupported", why: "unevaluable", at: i }; }
    if (!same(a, b)) return { v: "invalid", at: i, why: "false-equality" };
    if (canon(l) !== canon(vis)) return { v: "unsupported", why: "source-not-visible", at: i };
    const au = authorize(l, r); if (!au.ok) return { v: "unsupported", why: au.why, at: i, grades }; grades.push(...au.grades); vis = r;
  }
  return isAtomT(vis) || (vis.k === "b" && vis.op === "-" && (vis.l as any).u) ? { v: "verified", why: "all-lines-authorised", grades } : { v: "unsupported", why: "incomplete" };
}
const out = corpus.map((c) => { const j = judge(c); return { id: c.id, category: c.category, expect: c.expect, firstInvalid: c.firstInvalid, got: j.v, gotInvalid: j.at ?? null, why: j.why, statement: c.statement, lines: c.lines }; });
writeFileSync(process.argv[3] ?? "/tmp/sim.json", JSON.stringify(out)); console.log(policy, out.length, "cases");
