/**
 * line-check@1: a line of working read as mathematics, beyond arithmetic, entirely on the device (no eval, nothing
 * fetched). It answers one question: is this line worth the same as the line before?
 *
 *   numbers            every part split at "=" has the same value: powers, roots, π, sin/cos/tan (radians, or 30°),
 *                      log/ln, percentages, a definite integral (∫ 0 to 3 (6 − 2x) dx, ∫₀³ …, ∫_0^3 …) and an
 *                      antiderivative between limits ([6x − x²] 0 to 3, […]₀³)
 *   an identity        both sides are the same for every x: (x + 1)² = x² + 2x + 1
 *   an equation        has the same solutions as the equation on the line before: 2x + 3 = 11 → 2x = 8 → x = 4
 *                      (one unknown; or two, when the equation is of first degree in the second)
 *   ∫ f dx = F + C     F differentiates back to f
 *   d/dx (f) = g       g is the derivative of f
 *
 * A line that cannot be read, or an equation with nothing before it to compare with, is "unreadable": never wrong.
 */
type Node =
  | { k: "num"; v: number } | { k: "var"; n: string } | { k: "neg"; a: Node } | { k: "pm"; a: Node; b: Node }
  | { k: "op"; op: "+" | "-" | "*" | "/" | "^"; a: Node; b: Node } | { k: "fn"; f: string; a: Node };
export type LineState = "right" | "wrong" | "unreadable";
export interface LineCheck { state: LineState; why?: string }

const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹", SUB = "₀₁₂₃₄₅₆₇₈₉";
const FNS: Record<string, (v: number) => number> = { sin: Math.sin, cos: Math.cos, tan: Math.tan, ln: Math.log, log: Math.log10, sqrt: Math.sqrt, abs: Math.abs };
const plain = (s: string) => s.replace(/−/g, "-").replace(/[×·]/g, "*").replace(/÷/g, "/").replace(/π/g, "pi")
  .replace(/[⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (m) => `^(${[...m].map((c) => (c === "⁻" ? "-" : String(SUP.indexOf(c)))).join("")})`)
  .replace(/[₀-₉]+/g, (m) => [...m].map((c) => String(SUB.indexOf(c))).join(""));

function tokens(s: string): string[] | null {
  // a word or a unit (cm, birds, area) is not mathematics to check: only single letters, xy together, and the function names
  if ((plain(s).match(/[a-zA-Z]{2,}/g) ?? []).some((w) => !/^(?:sin|cos|tan|ln|log|sqrt|abs|pi|[xy]+)$/.test(w))) return null;
  const t = plain(s).replace(/\s+/g, "");
  const out = t.match(/\d+(?:\.\d+)?|sin|cos|tan|ln|log|sqrt|abs|pi|[a-zA-Z]|[+\-*/^()√±%°]/g);
  return out && out.join("") === t ? out : null;
}
function parse(s: string): Node | null {
  const tk = tokens(s);
  if (!tk || !tk.length) return null;
  let i = 0;
  const peek = () => tk[i];
  const atomStart = (t?: string) => !!t && (/^\d/.test(t) || /^[a-zA-Z]/.test(t) || t === "(" || t === "√");
  const expr = (): Node => { let a = term(); while (peek() === "+" || peek() === "-" || peek() === "±") { const op = tk[i++]; const b = term(); a = op === "±" ? { k: "pm", a, b } : { k: "op", op: op as "+" | "-", a, b }; } return a; };
  const term = (): Node => { let a = unary(); for (;;) { if (peek() === "*" || peek() === "/") { const op = tk[i++] as "*" | "/"; a = { k: "op", op, a, b: unary() }; } else if (atomStart(peek())) a = { k: "op", op: "*", a, b: power() }; else return a; } };
  const unary = (): Node => (peek() === "-" ? (i++, { k: "neg", a: unary() }) : peek() === "+" ? (i++, unary()) : power());
  const power = (): Node => { let a = post(atom()); if (peek() === "^") { i++; a = { k: "op", op: "^", a, b: unary() }; } return a; };
  const post = (a: Node): Node => (peek() === "%" ? (i++, { k: "op", op: "/", a, b: { k: "num", v: 100 } }) : peek() === "°" ? (i++, { k: "op", op: "*", a, b: { k: "num", v: Math.PI / 180 } }) : a);
  const atom = (): Node => {
    const t = tk[i++];
    if (t === undefined) throw new Error("end");
    if (/^\d/.test(t)) return { k: "num", v: Number(t) };
    if (t === "pi") return { k: "num", v: Math.PI };
    if (t === "√") return { k: "fn", f: "sqrt", a: power() };
    if (t in FNS) return { k: "fn", f: t, a: power() }; // sin x, sin(2x), sin 30°
    if (t === "e" && peek() === "^") return { k: "num", v: Math.E };
    if (/^[a-zA-Z]$/.test(t)) return { k: "var", n: t };
    if (t === "(") { const a = expr(); if (tk[i++] !== ")") throw new Error(")"); return a; }
    throw new Error(t);
  };
  try { const n = expr(); return i === tk.length ? n : null; } catch { return null; }
}
type Env = Record<string, number>;
function values(n: Node, env: Env): number[] {
  switch (n.k) {
    case "num": return [n.v];
    case "var": return [env[n.n] ?? NaN];
    case "neg": return values(n.a, env).map((v) => -v);
    case "fn": return values(n.a, env).map(FNS[n.f]);
    case "pm": return values(n.a, env).flatMap((a) => values(n.b, env).flatMap((b) => [a + b, a - b]));
    case "op": { const A = values(n.a, env), B = values(n.b, env); return A.flatMap((a) => B.map((b) => (n.op === "+" ? a + b : n.op === "-" ? a - b : n.op === "*" ? a * b : n.op === "/" ? a / b : a ** b))); }
  }
}
const one = (n: Node, env: Env) => { const v = values(n, env); return v.length === 1 ? v[0] : NaN; };
const varsOf = (n: Node, out = new Set<string>()): Set<string> => { if (n.k === "var") out.add(n.n); if ("a" in n) varsOf(n.a, out); if ("b" in n) varsOf(n.b, out); return out; };
const close = (a: number, b: number) => Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a), Math.abs(b));
const show = (v: number) => String(Math.round(v * 1000) / 1000);

// ---------------------------------------------------------------- integrals and limits
/** "0 to 3", "from 0 to 3", "_0^3", "03" left by ₀³ (one digit each): the two limits as numbers, with what is left. */
function limits(s: string): { a: number; b: number; rest: string } | null {
  const num = (t: string) => { const n = parse(t); if (!n || varsOf(n).size) return NaN; return one(n, {}); };
  let m = s.match(/^\s*(?:from\s+)?(\S+)\s+to\s+(\S+)(.*)$/i) ?? s.match(/^\s*_\s*\{?([^\s^{}]+)\}?\s*\^\s*\{?(\([^)]*\)|[^\s{}(]+)\}?(.*)$/);
  if (!m) { const u = s.match(/^\s*([₀-₉]+)([⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+)(.*)$/); if (u) m = [u[0], plain(u[1]), plain(u[2]).replace(/^\^\((.*)\)$/, "$1"), u[3]] as unknown as RegExpMatchArray; }
  if (!m) return null;
  const a = num(m[1]), b = num(m[2]);
  return Number.isFinite(a) && Number.isFinite(b) ? { a, b, rest: m[3] } : null;
}
function simpson(f: (x: number) => number, a: number, b: number): number {
  const N = 2000, h = (b - a) / N;
  let s = f(a) + f(b);
  for (let k = 1; k < N; k++) s += f(a + k * h) * (k % 2 ? 4 : 2);
  return (s * h) / 3;
}
/** One side of a line as a tree: an expression, a definite integral or an antiderivative between limits (both numbers). */
function side(raw: string): Node | null {
  const s = raw.trim();
  if (s.startsWith("∫")) {
    const lim = limits(s.slice(1));
    const body = (lim ? lim.rest : s.slice(1)).match(/^(.*?)\s*d\s*([a-zA-Z])\s*$/);
    if (!lim || !body) return null;
    const f = parse(body[1]);
    if (!f || [...varsOf(f)].some((v) => v !== body[2])) return null;
    const v = simpson((x) => one(f, { [body[2]]: x }), lim.a, lim.b);
    return Number.isFinite(v) ? { k: "num", v } : null;
  }
  const br = s.match(/^\[(.*)\](.*)$/);
  if (br) {
    const lim = limits(br[2]), F = parse(br[1]);
    if (!lim || !F || varsOf(F).size > 1) return null;
    const x = [...varsOf(F)][0] ?? "x";
    const v = one(F, { [x]: lim.b }) - one(F, { [x]: lim.a });
    return Number.isFinite(v) ? { k: "num", v } : null;
  }
  return parse(s);
}

// ---------------------------------------------------------------- identities, equations
const POINTS = [0.37, 1.13, 2.71, -1.59, 4.2, -0.83, 3.3];
function sameEverywhere(a: Node, b: Node, v: string): boolean | null {
  let seen = 0;
  for (const x of POINTS) { const p = values(a, { [v]: x }), q = values(b, { [v]: x }); if (p.length !== 1 || q.length !== 1 || !Number.isFinite(p[0]) || !Number.isFinite(q[0])) continue; seen++; if (!close(p[0], q[0])) return false; }
  return seen >= 3 ? true : null;
}
/** The solutions of f(x) = 0 between −60 and 60 (sign changes, and places where it only touches zero). */
function roots(f: (x: number) => number): number[] | null {
  const out: number[] = [];
  const add = (x: number) => { if (!out.some((r) => Math.abs(r - x) < 1e-5)) out.push(x); };
  const step = 0.125;
  let px = -60, pf = f(px), zeros = 0;
  for (let x = -60 + step; x <= 60 + 1e-9; x += step) {
    const fx = f(x);
    if (Number.isFinite(pf) && Math.abs(pf) < 1e-10) { add(px); zeros++; }
    else if (Number.isFinite(pf) && Number.isFinite(fx) && pf * fx < 0) {
      let lo = px, hi = x, flo = pf;
      for (let k = 0; k < 60; k++) { const mid = (lo + hi) / 2, fm = f(mid); if (flo * fm <= 0) hi = mid; else { lo = mid; flo = fm; } }
      // a jump across an asymptote is not a root
      if (Math.abs(f((lo + hi) / 2)) < 1e-6) add((lo + hi) / 2);
    } else if (Number.isFinite(pf) && Number.isFinite(fx)) {
      // touching zero between two grid points: the smallest |f| there
      let lo = px, hi = x;
      for (let k = 0; k < 50; k++) { const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3; if (Math.abs(f(m1)) < Math.abs(f(m2))) hi = m2; else lo = m1; }
      const mid = (lo + hi) / 2;
      if (Math.abs(f(mid)) < 1e-9 && Math.abs(mid - px) > 1e-7 && Math.abs(mid - x) > 1e-7) add(mid);
    }
    px = x; pf = fx;
  }
  return zeros > 40 ? null : out.sort((a, b) => a - b); // zero almost everywhere: not an equation to solve
}
const sameSet = (a: number[], b: number[]) => a.length === b.length && a.every((x, i) => Math.abs(x - b[i]) < 1e-4);

interface Eq { vars: string[]; f: (env: Env) => number; sols?: number[] }
/** "x = 2 or x = 3", "x = 2, 3", "x = ±3": the listed solutions; null when the line is not such a list. */
function listed(line: string): { v: string; sols: number[] } | null {
  const m = plain(line).match(/^\s*([a-zA-Z])\s*=\s*(.+)$/);
  if (!m) return null;
  const sols: number[] = [];
  for (const piece of m[2].split(/\s*(?:,|\bor\b|\band\b)\s*/i)) {
    const p = piece.replace(new RegExp(`^${m[1]}\\s*=\\s*`), "");
    const n = parse(/^\s*±/.test(p) ? `0${p.trim()}` : p);
    if (!n || varsOf(n).size) return null;
    for (const v of values(n, {})) if (Number.isFinite(v)) sols.push(v); else return null;
  }
  return { v: m[1], sols: [...new Set(sols.map((x) => Math.round(x * 1e6) / 1e6))].sort((a, b) => a - b) };
}

// ---------------------------------------------------------------- calculus lines
function calculus(line: string): LineCheck | null {
  const t = line.trim();
  // ∫ f dx = F (+ C): no limits
  let m = t.match(/^∫\s*(.*?)\s*d\s*([a-zA-Z])\s*=\s*(.+)$/);
  if (m && !limits(t.slice(1))) {
    const f = parse(m[1]), F = parse(m[3].replace(/\s*[+]\s*[cC]\s*$/, ""));
    if (!f || !F) return { state: "unreadable" };
    const v = m[2], h = 1e-5;
    let seen = 0;
    for (const x of POINTS) { const d = (one(F, { [v]: x + h }) - one(F, { [v]: x - h })) / (2 * h), want = one(f, { [v]: x }); if (!Number.isFinite(d) || !Number.isFinite(want)) continue; seen++; if (Math.abs(d - want) > 1e-4 * Math.max(1, Math.abs(want))) return { state: "wrong", why: "Differentiate your answer: it does not give back what you started with." }; }
    return seen >= 3 ? { state: "right" } : { state: "unreadable" };
  }
  // d/dx (f) = g
  m = t.match(/^d\s*\/\s*d\s*([a-zA-Z])\s*\(?(.*?)\)?\s*=\s*(.+)$/);
  if (m) {
    const f = parse(m[2]), g = parse(m[3]);
    if (!f || !g) return { state: "unreadable" };
    const v = m[1], h = 1e-5;
    let seen = 0;
    for (const x of POINTS) { const d = (one(f, { [v]: x + h }) - one(f, { [v]: x - h })) / (2 * h), got = one(g, { [v]: x }); if (!Number.isFinite(d) || !Number.isFinite(got)) continue; seen++; if (Math.abs(d - got) > 1e-4 * Math.max(1, Math.abs(d))) return { state: "wrong", why: "That is not the derivative. Check each term." }; }
    return seen >= 3 ? { state: "right" } : { state: "unreadable" };
  }
  return null;
}

/** Every line of working in order. A line that starts with "=" carries on from the line before. */
export function checkWorkingLines(lines: readonly string[]): LineCheck[] {
  let prevSide = "";
  let eq: Eq | null = null;
  return lines.map((raw): LineCheck => {
    const t = raw.trim();
    const full = /^=/.test(t) ? (prevSide ? `${prevSide} ${t}` : "") : t;
    // a line with no "=" is not checked, but a line after it that starts with "=" carries on from it
    if (full && !full.includes("=")) { if (side(full)) prevSide = full; return { state: "unreadable" }; }
    if (!full) return { state: "unreadable" };
    prevSide = full.split("=").pop()!.trim();
    const calc = calculus(full);
    if (calc) return calc;
    // a list of solutions is compared with the equation before it
    const sols = listed(full);
    if (sols) {
      const before: Eq | null = eq;
      const now: Eq = { vars: [sols.v], f: () => NaN, sols: sols.sols };
      if (before && before.vars.length === 1 && before.vars[0] === sols.v && before.sols) {
        if (sameSet(sols.sols, before.sols)) { eq = now; return { state: "right" }; }
        return { state: "wrong", why: sols.sols.every((x) => before.sols!.some((y) => Math.abs(x - y) < 1e-4)) ? "There is another solution too." : "This does not have the same solution as the line before." };
      }
      if (!before) { eq = now; return { state: "unreadable" }; }
    }
    const parts = full.split("=").map((p) => p.trim());
    const nodes = parts.map(side);
    if (nodes.some((n) => !n)) return { state: "unreadable" };
    const ns = nodes as Node[];
    const vars = [...new Set(ns.flatMap((n) => [...varsOf(n)]))].sort();
    if (!vars.length) {
      const vals = ns.map((n) => values(n, {}));
      if (vals.some((v) => v.length !== 1 || !Number.isFinite(v[0]))) return { state: "unreadable" };
      const bad = vals.findIndex((v) => !close(v[0], vals[0][0]));
      return bad < 0 ? { state: "right" } : { state: "wrong", why: `${parts[0]} is ${show(vals[0][0])}, but ${parts[bad]} is ${show(vals[bad][0])}` };
    }
    if (vars.length === 1) {
      const v = vars[0];
      const same = ns.slice(1).map((n) => sameEverywhere(ns[0], n, v));
      if (same.every((x) => x === true)) return { state: "right" }; // true for every value: an identity
      if (ns.length !== 2) return same.some((x) => x === false) ? { state: "wrong", why: "These are not all the same. Check each part." } : { state: "unreadable" };
      // an equation: the same solutions as the equation before
      const mine = sols && sols.v === v ? sols.sols : roots((x) => { const a = values(ns[0], { [v]: x }), b = values(ns[1], { [v]: x }); return a.length === 1 && b.length === 1 ? a[0] - b[0] : NaN; });
      const before: Eq | null = eq;
      if (!mine) return { state: "unreadable" };
      const now: Eq = { vars: [v], f: (env) => one(ns[0], env) - one(ns[1], env), sols: mine };
      if (!before || before.vars.length !== 1 || before.vars[0] !== v || !before.sols) { eq = now; return { state: "unreadable" }; }
      if (sameSet(mine, before.sols)) { eq = now; return { state: "right" }; }
      return { state: "wrong", why: "This does not have the same solution as the line before." };
    }
    if (vars.length === 2 && ns.length === 2) {
      const f = (env: Env) => one(ns[0], env) - one(ns[1], env);
      const before: Eq | null = eq;
      const now: Eq = { vars, f };
      if (!before || before.vars.join() !== vars.join()) { eq = now; return { state: "unreadable" }; }
      // the same line or curve: where the equation before holds (solved for the second unknown, taken as first degree), this one holds
      const [x, y] = vars;
      let seen = 0;
      for (const px of POINTS) {
        const f0 = before.f({ [x]: px, [y]: 0 }), f1 = before.f({ [x]: px, [y]: 1 });
        if (!Number.isFinite(f0) || !Number.isFinite(f1) || close(f0, f1)) continue;
        const py = f0 / (f0 - f1);
        if (Math.abs(before.f({ [x]: px, [y]: py })) > 1e-6) return { state: "unreadable" }; // not of first degree in y: not compared
        seen++;
        if (Math.abs(f({ [x]: px, [y]: py })) > 1e-6) return { state: "wrong", why: "This is not the same as the line before." };
      }
      if (seen < 3) return { state: "unreadable" };
      eq = now;
      return { state: "right" };
    }
    return { state: "unreadable" };
  });
}

/** For deepen@1: the same reader, so a step that is deepened is read exactly as a typed line would be. */
export type ExprNode = Node;
export const readExpression = parse;
export const variablesOf = (n: ExprNode): string[] => [...varsOf(n)];
export const valueOf = (n: ExprNode, env: Record<string, number>): number => one(n, env);
