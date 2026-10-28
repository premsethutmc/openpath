// E7 final holdout: engine-free case DSL compiler. It only translates compact authoring syntax into the engine's input objects; it never imports or calls the verifier.
const NAMED = new Set(["sin", "cos", "tan", "ln", "exp", "sqrt", "abs", "atan"]);
const K = (v: number | string) => ({ kind: "constant", value: String(v) });
const X = (n: string) => ({ kind: "variable", name: n });
export function parseExpr(src: string, vars: string[] = ["x"]): any {
  const s = src.replace(/\s+/g, " ").trim(); let i = 0;
  const peek = () => s[i] ?? ""; const ws = () => { while (s[i] === " ") i++; };
  const mulOf = (fs: any[]) => (fs.length === 1 ? fs[0] : { kind: "multiply", factors: fs });
  const addOf = (ts: any[]) => (ts.length === 1 ? ts[0] : { kind: "add", terms: ts });
  function expr(): any { ws(); const terms: any[] = []; let sign = 1;
    if (peek() === "-") { sign = -1; i++; } else if (peek() === "+") i++;
    for (;;) { const t = term(); terms.push(sign === -1 ? { kind: "multiply", factors: [K(-1), t] } : t); ws();
      if (peek() === "+") { i++; sign = 1; } else if (peek() === "-") { i++; sign = -1; } else break; }
    return addOf(terms); }
  function term(): any { const fs: any[] = [factor()]; for (;;) { ws(); const c = peek();
      if (c === "*") { i++; fs.push(factor()); } else if (c === "/") { i++; fs.push({ kind: "power", base: factor(), exponent: -1 }); }
      else if (c && (/[0-9a-z(]/i.test(c)) && c !== ")" ) { if (!startsAtom()) break; fs.push(factor()); } else break; }
    return mulOf(fs); }
  function startsAtom() { const c = peek(); return c === "(" || /[0-9]/.test(c) || /[a-z]/i.test(c); }
  function factor(): any { ws(); const b = atom(); ws();
    if (peek() === "^") { i++; ws(); let e: number; let neg = false;
      if (peek() === "(") { i++; ws(); if (peek() === "-") { neg = true; i++; } const m = /^[0-9]+(\/[0-9]+)?/.exec(s.slice(i)); if (!m) throw new Error("exponent: " + src); i += m[0].length; ws(); if (peek() !== ")") throw new Error("exponent paren: " + src); i++;
        if (m[0].includes("/")) { const [p, q] = m[0].split("/").map(Number); const core = p === 1 ? b : { kind: "power", base: b, exponent: p }; const r = { kind: "root", index: q, radicand: core }; return neg ? { kind: "power", base: r, exponent: -1 } : r; }
        e = Number(m[0]); }
      else { if (peek() === "-") { neg = true; i++; } const m = /^[0-9]+/.exec(s.slice(i)); if (!m) throw new Error("exponent: " + src); i += m[0].length; e = Number(m[0]); }
      if (b.kind === "constant" && b.value === "e" ) return { kind: "exp", argument: K(neg ? -e : e) };
      return { kind: "power", base: b, exponent: neg ? -e : e }; }
    return b; }
  function atom(): any { ws(); const c = peek();
    if (c === "(") { i++; const e = expr(); ws(); if (peek() !== ")") throw new Error("unclosed paren: " + src); i++; return e; }
    if (/[0-9]/.test(c)) { const m = /^[0-9]+/.exec(s.slice(i))!; i += m[0].length; return K(m[0]); }
    const m = /^[a-z]+/i.exec(s.slice(i)); if (!m) throw new Error(`unexpected '${c}' at ${i} in ${src}`);
    const w = m[0].toLowerCase();
    if (NAMED.has(w)) { i += w.length; ws(); let arg: any; if (peek() === "(") { i++; arg = expr(); ws(); if (peek() !== ")") throw new Error("unclosed fn: " + src); i++; } else arg = factorNoPow();
      if (w === "sqrt") return { kind: "root", index: 2, radicand: arg }; if (w === "ln") return { kind: "log", argument: arg }; return { kind: w, argument: arg }; }
    if (w === "e" && !vars.includes("e")) { i++; ws(); if (peek() === "^") { i++; ws(); let arg: any; if (peek() === "(") { i++; arg = expr(); ws(); i++; } else { const q = /^-?[0-9]+|^[a-z]/i.exec(s.slice(i)); if (!q) throw new Error("e^: " + src); i += q[0].length; arg = /^-?[0-9]/.test(q[0]) ? K(q[0]) : X(q[0]); } return { kind: "exp", argument: arg }; } throw new Error("bare e unsupported: " + src); }
    // single-letter variable (implicit products of letters like xy are split letter by letter)
    const ch = s[i]; if (!vars.includes(ch)) throw new Error(`unknown variable '${ch}' in ${src}`); i++; return X(ch); }
  function factorNoPow(): any { return atom(); }
  const out = expr(); ws(); if (i < s.length) throw new Error(`trailing '${s.slice(i)}' in ${src}`); return out; }

export function compileProblem(p: any): any {
  if (p.raw) return p.raw;
  if (p.alg !== undefined) return { domain: "algebra", statement: p.alg };
  if (p.der !== undefined) return { domain: "calculus", task: "derivative", expression: parseExpr(p.der, [p.v ?? "x"]), variable: p.v ?? "x" };
  if (p.int !== undefined) return { domain: "calculus", task: "indefinite-integral", integrand: parseExpr(p.int, [p.v ?? "x"]), variable: p.v ?? "x" };
  if (p.defint !== undefined) return { domain: "calculus", task: "definite-integral", integrand: parseExpr(p.defint, [p.v ?? "x"]), variable: p.v ?? "x", lower: String(p.a), upper: String(p.b) };
  if (p.lim !== undefined) return { domain: "calculus", task: "limit", expression: parseExpr(p.lim, [p.v ?? "x"]), variable: p.v ?? "x", approach: String(p.at), side: p.side ?? "both" };
  if (p.stmt !== undefined) return { domain: p.domain ?? "calculus", task: p.task, statement: p.stmt };
  throw new Error("unknown problem form " + JSON.stringify(p).slice(0, 80));
}
export function compileWorking(w: any): any { if (typeof w === "string") return { format: "natural", text: w }; if (w.raw !== undefined) return w.raw; throw new Error("unknown working form"); }
