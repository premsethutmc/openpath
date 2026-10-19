/**
 * A learner's working (working@1): each line is checked for mathematical validity, and the method is recognised when
 * it is a known one. Any valid method is accepted; none is required. Working never changes how an answer counts as
 * evidence (that is the answer's correctness alone); it tells the learner, and a teacher, what they did.
 *
 *   numeric problems   every expression on a line (split at "=") must have the problem's value
 *   quadratics         every equation on a line must have exactly the problem's roots (substitution, plus a scan for
 *                      extra roots), and "x = 2 or x = 3" lines must list them
 */
import type { Problem } from "./families";

// ---------------------------------------------------------------- a small, safe expression reader (no eval)

type Node = { k: "num"; v: number } | { k: "x" } | { k: "op"; op: "+" | "-" | "*" | "/" | "^"; a: Node; b: Node } | { k: "neg"; a: Node } | { k: "sqrt"; a: Node } | { k: "pm"; a: Node; b: Node };
function tokens(s: string): string[] | null {
  const t = s.replace(/−/g, "-").replace(/[×·]/g, "*").replace(/÷/g, "/").replace(/²/g, "^2").replace(/³/g, "^3").replace(/\s+/g, "");
  const out = t.match(/\d+(?:\.\d+)?|[x+\-*/^()√±]/g);
  return out && out.join("") === t ? out : null;
}
function parse(s: string): Node | null {
  const found = tokens(s);
  if (!found || !found.length) return null;
  const tk: string[] = found;
  let i = 0;
  const peek = () => tk[i];
  const atomStart = (t?: string) => !!t && (/^\d/.test(t) || t === "x" || t === "(" || t === "√");
  function expr(): Node {
    let a = term();
    while (peek() === "+" || peek() === "-" || peek() === "±") {
      const op = tk[i++];
      const b = term();
      a = op === "±" ? { k: "pm", a, b } : { k: "op", op: op as "+" | "-", a, b };
    }
    return a;
  }
  function term(): Node {
    let a = unary();
    for (;;) {
      if (peek() === "*" || peek() === "/") {
        const op = tk[i++] as "*" | "/";
        a = { k: "op", op, a, b: unary() };
      } else if (atomStart(peek())) a = { k: "op", op: "*", a, b: unary() }; // implicit: 2x, (x-2)(x-3)
      else return a;
    }
  }
  function unary(): Node {
    if (peek() === "-") {
      i++;
      return { k: "neg", a: unary() };
    }
    if (peek() === "+") {
      i++;
      return unary();
    }
    return power();
  }
  function power(): Node {
    const a = atom();
    if (peek() === "^") {
      i++;
      return { k: "op", op: "^", a, b: unary() };
    }
    return a;
  }
  function atom(): Node {
    const t = tk[i++];
    if (t === undefined) throw new Error("end");
    if (/^\d/.test(t)) return { k: "num", v: Number(t) };
    if (t === "x") return { k: "x" };
    if (t === "√") return { k: "sqrt", a: atom() };
    if (t === "(") {
      const a = expr();
      if (tk[i++] !== ")") throw new Error(")");
      return a;
    }
    throw new Error(t);
  }
  try {
    const n = expr();
    return i === tk.length ? n : null;
  } catch {
    return null;
  }
}
/** All values of an expression (two for ±), at x. */
function values(n: Node, x: number): number[] {
  switch (n.k) {
    case "num":
      return [n.v];
    case "x":
      return [x];
    case "neg":
      return values(n.a, x).map((v) => -v);
    case "sqrt":
      return values(n.a, x).map(Math.sqrt);
    case "pm":
      return values(n.a, x).flatMap((a) => values(n.b, x).flatMap((b) => [a + b, a - b]));
    case "op": {
      const A = values(n.a, x);
      const B = values(n.b, x);
      return A.flatMap((a) => B.map((b) => (n.op === "+" ? a + b : n.op === "-" ? a - b : n.op === "*" ? a * b : n.op === "/" ? a / b : a ** b)));
    }
  }
}
const hasX = (n: Node): boolean => n.k === "x" || ("a" in n && hasX(n.a)) || ("b" in n && hasX((n as { b: Node }).b));
const close = (a: number, b: number) => Math.abs(a - b) < 1e-9;

// ---------------------------------------------------------------- checking and recognising

export interface WorkingCheck {
  lines: { text: string; valid: boolean; why?: string }[];
  valid: boolean;
  method: { id: string; name: string } | null;
  note: string;
}
const METHODS: Record<string, string> = {
  decomposition: "Split into facts you know",
  "near-fact": "A fact next door",
  doubling: "Doubling",
  "repeated-addition": "Adding equal groups",
  factorising: "Factorising",
  formula: "The quadratic formula",
  "completing-square": "Completing the square",
  other: "Your own way",
};
const supportsWorking = (pr: Problem) => ["mul", "rect", "cint", "linev", "eqfrac", "quad"].includes(pr.family);
export const canCheckWorking = supportsWorking;

function numericValue(pr: Problem): number {
  const [n, d] = pr.answer.split("/").map(Number);
  return d ? n / d : n;
}
/** A numeric line is valid when it is a true statement: every part (split at "=") has the same value. */
function checkNumeric(_pr: Problem, line: string) {
  const parts = line.split("=").map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return { valid: false, why: "empty" };
  const vals: number[] = [];
  for (const p of parts) {
    const n = parse(p);
    if (!n || hasX(n)) return { valid: false, why: `“${p}” could not be read as a calculation` };
    const v = values(n, 0);
    if (v.length !== 1 || !Number.isFinite(v[0])) return { valid: false, why: `“${p}” is not one number` };
    vals.push(v[0]);
  }
  const bad = vals.findIndex((v) => !close(v, vals[0]));
  return bad < 0 ? { valid: true, value: vals[0] } : { valid: false, why: `${parts[0]} is ${round(vals[0])}, but ${parts[bad]} is ${round(vals[bad])}` };
}
const round = (v: number) => Math.round(v * 1000) / 1000;
function rootsOf(pr: Problem) {
  return pr.answer.split(",").map(Number);
}
function checkQuadratic(pr: Problem, line: string) {
  const roots = rootsOf(pr);
  const t = line.replace(/−/g, "-").replace(/\s+/g, "");
  // "x=2orx=3", "x=2,3", "x=2 and x=3"
  const listed = t.match(/^x=(-?\d+(?:\.\d+)?)(?:or|and|,)(?:x=)?(-?\d+(?:\.\d+)?)$/);
  if (listed) {
    const v = [Number(listed[1]), Number(listed[2])].sort((a, b) => a - b);
    return v.every((x, k) => close(x, roots[k])) ? { valid: true } : { valid: false, why: "those are not the solutions" };
  }
  const sides = line.split("=");
  if (sides.length !== 2) return { valid: false, why: "a line should be one equation" };
  const L = parse(sides[0]);
  const R = parse(sides[1]);
  if (!L || !R) return { valid: false, why: "could not be read" };
  if (!hasX(L) && !hasX(R)) return { valid: false, why: "no x in this line" };
  // "x = 5/2 ± 1/2": the right side's values are the solutions
  if (L.k === "x" && !hasX(R)) {
    const v = values(R, 0).sort((a, b) => a - b);
    return v.length === roots.length && v.every((x, k) => close(x, roots[k])) ? { valid: true } : { valid: false, why: "those are not the solutions" };
  }
  const f = (x: number) => {
    const a = values(L, x);
    const b = values(R, x);
    return a.length === 1 && b.length === 1 ? a[0] - b[0] : NaN;
  };
  if (!roots.every((r) => close(f(r), 0))) return { valid: false, why: "a solution of the problem does not satisfy this line" };
  for (let x = -20; x <= 20; x += 0.25) if (!roots.some((r) => close(r, x)) && close(f(x), 0)) return { valid: false, why: `x = ${x} also satisfies this line, so it is not the same equation` };
  return { valid: true };
}

function recogniseMul(pr: Problem, lines: string[]): string {
  const [a, b] = pr.family === "mul" || pr.family === "rect" ? pr.params : pr.family === "cint" ? [pr.params[2], pr.params[1] - pr.params[0]] : [0, 0];
  const first = (lines[0] ?? "").split("=")[0].replace(/−/g, "-").replace(/[×*]/g, "x").replace(/\s+/g, "");
  const terms = first.split(/(?=[+-])/).map((t) => t.replace(/^\+/, ""));
  const prods = terms.map((t) => t.match(/^(-?\d+)x(\d+)$/)).map((m) => (m ? [Number(m[1]), Number(m[2])] : null));
  if (prods.length >= 2 && prods.every(Boolean)) {
    const ps = prods as number[][];
    if (ps.every(([p]) => p === a) && ps.reduce((s, [, q]) => s + q, 0) === b) return "decomposition";
    if (ps.every(([, q]) => q === b) && ps.reduce((s, [p]) => s + p, 0) === a) return "decomposition";
    if (ps.every(([, q]) => q === a) && ps.reduce((s, [p]) => s + p, 0) === b) return "decomposition";
  }
  if (/^\d+x\d+[+-]\d+$/.test(first)) {
    const m = first.match(/^(\d+)x(\d+)([+-])(\d+)$/)!;
    const [p, q, r] = [Number(m[1]), Number(m[2]), Number(m[4])];
    // a fact one row or column away, then one group added or taken away (the line is already checked to be right)
    const near = (x: number, y: number, X: number, Y: number) => (x === X && Math.abs(y - Y) === 1 && r === X) || (y === Y && Math.abs(x - X) === 1 && r === Y);
    if (near(p, q, a, b) || near(p, q, b, a)) return "near-fact";
  }
  if (terms.length >= 3 && terms.every((t) => t === String(a) || t === String(b))) return "repeated-addition";
  if (/^\d+(x2)+$/.test(first) || /^2(x2)*x\d+$/.test(first)) return "doubling";
  const nums = lines.map((l) => Number(l.split("=").at(-1)!.trim()));
  if (nums.length >= 3 && nums.every((n, k) => k === 0 || close(n, 2 * nums[k - 1]))) return "doubling";
  return "other";
}
function recogniseQuad(lines: string[]): string {
  const all = lines.join(" ").replace(/\s+/g, "");
  if (/\(x[+-−]\d+\)\(x[+-−]\d+\)=0/.test(all.replace(/−/g, "-"))) return "factorising";
  if (/\(x[+-−]\d+(?:\/\d+)?\)(?:\^2|²)=/.test(all)) return "completing-square";
  if (/√|±/.test(all)) return "formula";
  return "other";
}

export function checkWorking(pr: Problem, raw: string[]): WorkingCheck {
  const lines = raw.map((l) => l.trim()).filter(Boolean).slice(0, 8);
  if (!supportsWorking(pr)) return { lines: lines.map((text) => ({ text, valid: false, why: "working is not checked for this kind of problem" })), valid: false, method: null, note: "Working is kept, but not checked, for this kind of problem." };
  const checked: { text: string; valid: boolean; why?: string; value?: number }[] = lines.map((text) => ({ text, ...(pr.family === "quad" ? checkQuadratic(pr, text) : checkNumeric(pr, text)) }));
  // numeric working must end at the problem's value (intermediate lines may be other true steps, like 7 × 2 = 14)
  const last = checked.at(-1);
  if (pr.family !== "quad" && last?.valid && !close(last.value!, numericValue(pr))) Object.assign(last, { valid: false, why: `the working ends at ${round(last.value!)}, not at the answer` });
  const valid = checked.length > 0 && checked.every((l) => l.valid);
  const id = !valid ? null : pr.family === "quad" ? recogniseQuad(lines) : recogniseMul(pr, lines);
  return {
    lines: checked.map(({ text, valid, why }) => ({ text, valid, ...(why ? { why } : {}) })),
    valid,
    method: id ? { id, name: METHODS[id] } : null,
    note: !lines.length ? "No working given." : valid ? (id === "other" ? "Every line is right. That is a valid way, even if it is not one of the ways taught here." : "Every line is right.") : `A line has a slip: ${checked.find((l) => !l.valid)!.why}.`,
  };
}
