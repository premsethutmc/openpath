// A small search-based planner for one-variable linear equations.
// State -> applicable general moves -> new states -> goal test. No stored solutions; moves are
// general algebra rules. Breadth-first with a depth limit and a node cap. Every move names its rule.
import { Rational, Expr, evaluate, type MathExpr } from "../math-kernel.ts";
import { parseExpr, printExpr } from "./expr-text.ts";

export interface Eq { left: MathExpr; right: MathExpr }
export interface Move { rule: string; explain: string; to: Eq }
export interface TraceStep { rule: string; explain: string; to: string }
export type Outcome = "solved" | "no-solution" | "identity" | "unsupported" | "not-found";
export interface PlanResult {
  outcome: Outcome;
  reason: string;
  answer: string | null;
  steps: TraceStep[];
  stats: { visited: number; generated: number; duplicates: number; depth: number; capped: boolean };
  visitLog?: { from: string; rule: string; to: string; status: "new" | "duplicate" }[];
}

const ZERO = Rational.zero;
const eqText = (q: Eq) => `${printExpr(q.left)}=${printExpr(q.right)}`;
const hasVar = (e: MathExpr): boolean => {
  switch (e.kind) {
    case "num": return false;
    case "var": return true;
    case "neg": return hasVar(e.operand);
    case "pow": return hasVar(e.base) || hasVar(e.exp);
    case "frac": return hasVar(e.num) || hasVar(e.den);
    case "quantity": return hasVar(e.value);
    default: return hasVar(e.left) || hasVar(e.right);
  }
};
const isNum = (e: MathExpr): e is Extract<MathExpr, { kind: "num" }> => e.kind === "num";
const num = (r: Rational) => Expr.num(r);

/** Coefficient k if e is a product/quotient of numbers with exactly one x (k*x form). */
function linCoef(e: MathExpr): Rational | null {
  switch (e.kind) {
    case "var": return Rational.one;
    case "neg": { const k = linCoef(e.operand); return k && k.neg(); }
    case "mul": {
      if (!hasVar(e.left) && !hasVar(e.right)) return null;
      if (!hasVar(e.left)) { const k = linCoef(e.right); const c = tryEval(e.left); return k && c && k.mul(c); }
      if (!hasVar(e.right)) { const k = linCoef(e.left); const c = tryEval(e.right); return k && c && k.mul(c); }
      return null;
    }
    case "div": {
      if (hasVar(e.right)) return null;
      const k = linCoef(e.left); const d = tryEval(e.right);
      return k && d && !d.isZero() ? k.div(d) : null;
    }
    default: return null;
  }
}
function tryEval(e: MathExpr): Rational | null {
  if (hasVar(e)) return null;
  try { return evaluate(e); } catch { return null; }
}
const canonLin = (k: Rational): MathExpr =>
  k.isOne() ? Expr.var("x") : Expr.mul(num(k), Expr.var("x"));

/** Flatten a +/- chain into signed terms. */
function terms(e: MathExpr, sign = 1, out: { sign: number; t: MathExpr }[] = []): { sign: number; t: MathExpr }[] {
  if (e.kind === "add") { terms(e.left, sign, out); terms(e.right, sign, out); }
  else if (e.kind === "sub") { terms(e.left, sign, out); terms(e.right, -sign, out); }
  else out.push({ sign, t: e });
  return out;
}
function rebuild(ts: { sign: number; t: MathExpr }[]): MathExpr {
  if (ts.length === 0) return num(ZERO);
  let acc: MathExpr = ts[0].sign > 0 ? ts[0].t : Expr.neg(ts[0].t);
  for (let i = 1; i < ts.length; i++) acc = ts[i].sign > 0 ? Expr.add(acc, ts[i].t) : Expr.sub(acc, ts[i].t);
  return acc;
}

/** Simplify: fold constants, canonicalise k*x terms, combine like terms. Returns [expr, notes]. */
function simplify(e: MathExpr, notes: Set<string>): MathExpr {
  const c = tryEval(e);
  if (c && e.kind !== "num") { notes.add("evaluate numbers"); return num(c); }
  switch (e.kind) {
    case "add": case "sub": {
      const ts = terms(e).map(({ sign, t }) => ({ sign, t: simplify(t, notes) }));
      const lins = ts.filter((x) => linCoef(x.t) !== null);
      const consts = ts.filter((x) => isNum(x.t));
      const others = ts.filter((x) => linCoef(x.t) === null && !isNum(x.t));
      let kSum = ZERO; for (const l of lins) kSum = kSum.add(linCoef(l.t)!.mul(new Rational(l.sign)));
      let cSum = ZERO; for (const q of consts) cSum = cSum.add((q.t as { value: Rational }).value.mul(new Rational(q.sign)));
      if (lins.length > 1 || consts.length > 1) notes.add("combine like terms");
      const out: { sign: number; t: MathExpr }[] = [];
      if (lins.length) { if (!kSum.isZero() || (!consts.length && !others.length)) out.push({ sign: kSum.lt(ZERO) ? -1 : 1, t: canonLin(kSum.lt(ZERO) ? kSum.neg() : kSum) }); }
      for (const o of others) out.push(o);
      if (consts.length && (!cSum.isZero() || out.length === 0)) out.push({ sign: cSum.lt(ZERO) ? -1 : 1, t: num(cSum.lt(ZERO) ? cSum.neg() : cSum) });
      if (out.length && out[0].sign < 0 && out[0].t.kind === "num") { const v = (out[0].t as { value: Rational }).value; out[0] = { sign: 1, t: num(v.neg()) }; }
      return rebuild(out);
    }
    case "mul": case "div": {
      const l = simplify(e.left, notes), r = simplify(e.right, notes);
      const n: MathExpr = e.kind === "mul" ? Expr.mul(l, r) : Expr.div(l, r);
      const k = linCoef(n);
      if (k !== null && !(n.kind === "var")) { const cl = canonLin(k); if (printExpr(cl) !== printExpr(n)) { notes.add("combine coefficient"); return cl; } }
      return n;
    }
    case "neg": {
      const o = simplify(e.operand, notes); const n = Expr.neg(o);
      const k = linCoef(n); if (k !== null) { notes.add("combine coefficient"); return canonLin(k); }
      return n;
    }
    case "pow": return Expr.pow(simplify(e.base, notes), simplify(e.exp, notes));
    default: return e;
  }
}

/** Every sub-expression position, rebuilt with a replacement. */
function rewriteAt(e: MathExpr, f: (n: MathExpr) => { to: MathExpr; what: string }[]): { to: MathExpr; what: string }[] {
  const out = f(e).slice();
  const sub = (ch: MathExpr, wrap: (c: MathExpr) => MathExpr) => { for (const r of rewriteAt(ch, f)) out.push({ to: wrap(r.to), what: r.what }); };
  switch (e.kind) {
    case "add": case "sub": case "mul": case "div":
      sub(e.left, (c) => ({ ...e, left: c } as MathExpr)); sub(e.right, (c) => ({ ...e, right: c } as MathExpr)); break;
    case "neg": sub(e.operand, (c) => Expr.neg(c)); break;
    case "pow": sub(e.base, (c) => Expr.pow(c, e.exp)); sub(e.exp, (c) => Expr.pow(e.base, c)); break;
    default: break;
  }
  return out;
}

const isSum = (e: MathExpr) => e.kind === "add" || e.kind === "sub";
function distributeAt(n: MathExpr): { to: MathExpr; what: string }[] {
  const r: { to: MathExpr; what: string }[] = [];
  if (n.kind === "mul" && isSum(n.right)) { const s = n.right as { kind: "add" | "sub"; left: MathExpr; right: MathExpr }; r.push({ to: { kind: s.kind, left: Expr.mul(n.left, s.left), right: Expr.mul(n.left, s.right) } as MathExpr, what: "multiply the factor into each term of the bracket" }); }
  if (n.kind === "mul" && isSum(n.left)) { const s = n.left as { kind: "add" | "sub"; left: MathExpr; right: MathExpr }; r.push({ to: { kind: s.kind, left: Expr.mul(s.left, n.right), right: Expr.mul(s.right, n.right) } as MathExpr, what: "multiply the factor into each term of the bracket" }); }
  if (n.kind === "div" && isSum(n.left) && !hasVar(n.right)) { const s = n.left as { kind: "add" | "sub"; left: MathExpr; right: MathExpr }; r.push({ to: { kind: s.kind, left: Expr.div(s.left, n.right), right: Expr.div(s.right, n.right) } as MathExpr, what: "divide each term of the numerator by the denominator" }); }
  if (n.kind === "neg" && isSum(n.operand)) { const s = n.operand as { kind: "add" | "sub"; left: MathExpr; right: MathExpr }; r.push({ to: { kind: s.kind === "add" ? "sub" : "add", left: Expr.neg(s.left), right: s.right } as MathExpr, what: "remove the bracket by changing signs" }); }
  if (n.kind === "sub" && isSum(n.right)) { const s = n.right as { kind: "add" | "sub"; left: MathExpr; right: MathExpr }; r.push({ to: Expr.sub(Expr.sub(n.left, s.left), s.kind === "add" ? s.right : Expr.neg(s.right)) , what: "remove the bracket after a minus by changing signs" }); }
  return r;
}

function denominators(e: MathExpr, acc: Rational[] = []): Rational[] | null {
  if (e.kind === "div") {
    if (hasVar(e.right)) return null;
    const d = tryEval(e.right); if (d && !d.isZero()) acc.push(d.lt(ZERO) ? d.neg() : d); else return null;
    return denominators(e.left, acc);
  }
  if (e.kind === "add" || e.kind === "sub" || e.kind === "mul") { return denominators(e.left, acc) && denominators(e.right, acc); }
  if (e.kind === "neg") return denominators(e.operand, acc);
  if (e.kind === "pow") return denominators(e.base, acc);
  return acc;
}
const gcd = (a: bigint, b: bigint): bigint => (b === 0n ? (a < 0n ? -a : a) : gcd(b, a % b));

export function movesFrom(q: Eq): Move[] {
  const out: Move[] = [];
  const seen = new Set<string>();
  const add = (rule: string, explain: string, to: Eq) => { const k = rule + "|" + eqText(to); if (!seen.has(k)) { seen.add(k); out.push({ rule, explain, to }); } };
  // 1. simplify both sides
  const notes = new Set<string>();
  const sl = simplify(q.left, notes), sr = simplify(q.right, notes);
  const simp = { left: sl, right: sr };
  if (eqText(simp) !== eqText(q)) {
    // Tidying never loses information, so when it applies it is the only move offered (keeps the search small).
    add("simplify", `simplify both sides (${[...notes].join(", ") || "tidy"})`, simp);
    return out;
  }
  // 2. rewrite moves inside either side
  for (const side of ["left", "right"] as const) {
    for (const r of rewriteAt(q[side], distributeAt)) add("expand", r.what, side === "left" ? { left: r.to, right: q.right } : { left: q.left, right: r.to });
  }
  // Removing brackets never loses information either: while any remain, only bracket-removal moves are offered.
  if (out.length) return out;
  // 3. do the same thing to both sides
  for (const side of ["left", "right"] as const) {
    for (const { sign, t } of terms(q[side])) {
      if (isNum(t) && t.value.isZero()) continue;
      const wasSingle = terms(q[side]).length === 1;
      if (wasSingle) continue; // cannot move the only term of a side
      const inv = sign > 0 ? "subtract" : "add";
      const mk = (e: MathExpr) => (sign > 0 ? Expr.sub(e, t) : Expr.add(e, t));
      add(`${inv}-both-sides`, `${inv} ${printExpr(t)} from both sides`.replace("add ", "add ").replace("from both", sign > 0 ? "from both" : "to both"), { left: mk(q.left), right: mk(q.right) });
    }
  }
  const dens = [...(denominators(q.left) ?? []), ...(denominators(q.right) ?? [])];
  if (dens.length && denominators(q.left) !== null && denominators(q.right) !== null) {
    const distinct = [...new Map(dens.map((d) => [d.toString(), d])).values()];
    let l = 1n; for (const d of dens) { const n = BigInt(d.num); l = (l * n) / gcd(l, n); }
    const cands = [...distinct]; if (distinct.length > 1) cands.push(new Rational(l));
    for (const d of cands) add("multiply-both-sides", `multiply both sides by ${d.toString()} to clear a denominator`, { left: Expr.mul(num(d), q.left), right: Expr.mul(num(d), q.right) });
  }
  for (const side of ["left", "right"] as const) {
    const k = linCoef(q[side]);
    if (k && !k.isZero() && !k.isOne() && q[side].kind !== "var" && printExpr(q[side]) === printExpr(canonLin(k)))
      add("divide-both-sides", `divide both sides by ${k.toString()}`, { left: Expr.div(q.left, num(k)), right: Expr.div(q.right, num(k)) });
  }
  // 4. swap sides
  if (q.right.kind === "var" && !hasVar(q.left)) add("swap-sides", "write the unknown on the left", { left: q.right, right: q.left });
  return out;
}

function terminal(q: Eq): { outcome: Outcome; reason: string } | null {
  if (q.left.kind === "var" && isNum(q.right)) return { outcome: "solved", reason: "x isolated" };
  if (!hasVar(q.left) && !hasVar(q.right)) {
    const a = tryEval(q.left), b = tryEval(q.right);
    if (a && b) return a.eq(b) ? { outcome: "identity", reason: "both sides equal for every x" } : { outcome: "no-solution", reason: `reduces to ${a.toString()} = ${b.toString()}, which is false for every x` };
  }
  return null;
}

/** Structural reasons the move set cannot handle an equation (reported, never guessed). */
function unsupportedReason(q: Eq): string | null {
  let reason: string | null = null;
  const walk = (e: MathExpr): void => {
    if (reason) return;
    if (e.kind === "div" && hasVar(e.right)) { reason = "variable in a denominator (needs excluded values; not in the move set)"; return; }
    if (e.kind === "pow" && hasVar(e.base)) { reason = "nonlinear: x raised to a power (not in the move set)"; return; }
    if (e.kind === "mul" && hasVar(e.left) && hasVar(e.right)) { reason = "nonlinear: x times x (not in the move set)"; return; }
    switch (e.kind) {
      case "add": case "sub": case "mul": case "div": walk(e.left); walk(e.right); break;
      case "neg": walk(e.operand); break;
      case "pow": walk(e.base); walk(e.exp); break;
      default: break;
    }
  };
  walk(q.left); walk(q.right);
  return reason;
}

export function plan(text: string, opts: { maxDepth?: number; maxNodes?: number; log?: boolean } = {}): PlanResult {
  const maxDepth = opts.maxDepth ?? 14, maxNodes = opts.maxNodes ?? 100000;
  const parts = text.split("=");
  if (parts.length !== 2) throw new Error(`not an equation: ${text}`);
  const start: Eq = { left: parseExpr(parts[0]), right: parseExpr(parts[1]) };
  const stats = { visited: 0, generated: 0, duplicates: 0, depth: 0, capped: false };
  const visitLog: NonNullable<PlanResult["visitLog"]> = [];
  const un = unsupportedReason(start);
  if (un) return { outcome: "unsupported", reason: un, answer: null, steps: [], stats, ...(opts.log ? { visitLog } : {}) };
  const seen = new Map<string, { parent: string | null; rule: string; explain: string; eq: Eq; depth: number }>();
  const key0 = eqText(start);
  seen.set(key0, { parent: null, rule: "start", explain: "given equation", eq: start, depth: 0 });
  let frontier = [key0];
  const done = (key: string, t: { outcome: Outcome; reason: string }): PlanResult => {
    const steps: TraceStep[] = [];
    for (let k: string | null = key; k !== null; k = seen.get(k)!.parent) {
      const s = seen.get(k)!; if (s.parent !== null) steps.unshift({ rule: s.rule, explain: s.explain, to: k });
    }
    const fin = seen.get(key)!.eq;
    return { outcome: t.outcome, reason: t.reason, answer: t.outcome === "solved" ? printExpr(fin.right) : null, steps, stats, ...(opts.log ? { visitLog } : {}) };
  };
  const t0 = terminal(start); if (t0) return done(key0, t0);
  for (let depth = 1; depth <= maxDepth && frontier.length; depth++) {
    const next: string[] = [];
    for (const k of frontier) {
      stats.visited++;
      const node = seen.get(k)!;
      for (const m of movesFrom(node.eq)) {
        stats.generated++;
        const tk = eqText(m.to);
        if (seen.has(tk)) { stats.duplicates++; if (opts.log) visitLog.push({ from: k, rule: m.rule, to: tk, status: "duplicate" }); continue; }
        seen.set(tk, { parent: k, rule: m.rule, explain: m.explain, eq: m.to, depth });
        stats.depth = depth;
        if (opts.log) visitLog.push({ from: k, rule: m.rule, to: tk, status: "new" });
        const t = terminal(m.to); if (t) return done(tk, t);
        next.push(tk);
        if (seen.size > maxNodes) { stats.capped = true; return { outcome: "not-found", reason: "node cap reached", answer: null, steps: [], stats, ...(opts.log ? { visitLog } : {}) }; }
      }
    }
    frontier = next;
  }
  return { outcome: "not-found", reason: `no solution path within depth ${maxDepth}`, answer: null, steps: [], stats, ...(opts.log ? { visitLog } : {}) };
}
