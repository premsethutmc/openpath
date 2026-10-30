// Independent test oracle for the grading audit. It imports NOTHING from the graders (answer-types, content, assessment, grade):
// expected outcomes come from the generator's stored answer plus explicit, type-level mathematical rules written here.
export type Rat = { n: bigint; d: bigint };
const gcd = (a: bigint, b: bigint): bigint => (b === 0n ? (a < 0n ? -a : a) : gcd(b, a % b));
export const mk = (n: bigint, d: bigint): Rat => { if (d < 0n) { n = -n; d = -d; } const g = gcd(n, d) || 1n; return { n: n / g, d: d / g }; };
export function rat(s: string): Rat | null {
  const t = s.replace(/−/g, "-").trim(); let m = t.match(/^([+-]?\d+)\/(\d+)$/); if (m) return Number(m[2]) ? mk(BigInt(m[1]), BigInt(m[2])) : null;
  m = t.match(/^([+-]?)(\d*)\.?(\d*)$/); if (!m || (!m[2] && !m[3])) return null; return mk(BigInt(m[1] + (m[2] || "0") + m[3]), 10n ** BigInt(m[3].length));
}
export const show = (q: Rat) => (q.d === 1n ? String(q.n) : `${q.n}/${q.d}`);
export const eq = (a: Rat, b: Rat) => a.n === b.n && a.d === b.d;
export const dec = (q: Rat): string | null => { let d = q.d, k = 0; while (d % 10n === 0n) { d /= 10n; k++; } let tw = 0, fi = 0; while (d % 2n === 0n) { d /= 2n; tw++; } while (d % 5n === 0n) { d /= 5n; fi++; } if (d !== 1n) return null; const p = k + Math.max(tw, fi); const sc = (q.n * 10n ** BigInt(p)) / q.d; const s = (sc < 0n ? -sc : sc).toString().padStart(p + 1, "0"); return (q.n < 0n ? "-" : "") + (p ? s.slice(0, -p) + "." + s.slice(-p) : s); };
export type Part = { sep: string } | { tok: string };
export const split = (a: string, grouped = true): Part[] => { const out: Part[] = []; for (const m of a.matchAll(grouped ? /([[\](){},;\s]+)|([^[\](){},;\s]+(?:\s+[^[\](){},;\s]+)*)/g : /([[\](){},;\s]+)|([^[\](){},;\s]+)/g)) out.push(m[1] !== undefined ? { sep: m[1] } : { tok: m[2] }); return out; };
export const join = (ps: Part[]) => ps.map((p) => ("sep" in p ? p.sep : p.tok)).join("");
/** top-level terms of a sum, with signs, for a commutative reordering (depth counts brackets and |…| pairs). Null when it is not a sum of >= 2 terms. */
export function terms(a: string): { sign: string; body: string }[] | null {
  const out: { sign: string; body: string }[] = []; let depth = 0, bar = false, cur = "", sign = "+";
  const t = a.trim(); let i = 0;
  if (t[0] === "−" || t[0] === "-") { sign = "−"; i = 1; }
  for (; i < t.length; i++) {
    const ch = t[i];
    if ("([{".includes(ch)) depth++; else if (")]}".includes(ch)) depth--; else if (ch === "|") bar = !bar;
    if (depth === 0 && !bar && /[+−-]/.test(ch) && t[i - 1] === " " && t[i + 1] === " ") { out.push({ sign, body: cur.trim() }); sign = ch === "+" ? "+" : "−"; cur = ""; continue; }
    cur += ch;
  }
  out.push({ sign, body: cur.trim() }); return out.length >= 2 && depth === 0 && !bar && out.every((x) => x.body) ? out : null;
}
export const sumOf = (ts: { sign: string; body: string }[]) => ts.map((x, i) => (i === 0 ? (x.sign === "−" ? "−" : "") + x.body : ` ${x.sign} ${x.body}`)).join("");
export type Sub = { cat: string; resp: string; want: "credit" | "no-credit" | "unresolved"; plain?: boolean; note?: string; working?: string[] };
/** Submissions with independently justified expected outcomes for one question. `kind` is the answer type. */
export function submissions(kind: string, answer: string, options: string[] | undefined, expanded: boolean): { subs: Sub[]; na: string[] } {
  const subs: Sub[] = [], na: string[] = [];
  const add = (cat: string, resp: string, want: Sub["want"], plain = false, working?: string[]) => { if (!subs.some((s) => s.resp === resp && s.cat === cat && JSON.stringify(s.working) === JSON.stringify(working))) subs.push({ cat, resp, want, plain, working }); };
  const A = answer.trim();
  add("correct", A, "credit");
  if (kind === "written") return { subs: [], na: ["written answers are marked by an educator; typed-answer tests do not apply"] };
  if (kind === "choice") {
    add("equiv", A.toLowerCase(), "credit"); add("equiv", ` ${A} `, "credit");
    const others = ["A", "B", "C", "D"].filter((l) => l !== A && (!options || options.length > "ABCD".indexOf(l)));
    for (const l of others.slice(0, 2)) add("wrong", l, "no-credit", true);
    add("ambiguous", `${A} or ${others[0]}`, "no-credit"); add("ambiguous", `${A}${others[0]}`, "no-credit");
    for (const u of ["", "??", "E", "abc"]) add("unreadable", u, "unresolved");
    na.push("domain: no domain-invalid choice answer");
    add("working-ok", A, "credit", false, ["1 + 1 = 3"]); if (others[0]) add("working-wrong", others[0], "no-credit", true, ["x = 1", "x + 0 = 1"]);
    return { subs, na };
  }
  const listy = ["tuple", "matrix", "set", "roots"].includes(kind);
  const fine = split(A, false), useFine = listy && (fine.filter((p) => "tok" in p) as { tok: string }[]).every((p) => rat(p.tok));
  const parts = useFine ? fine : split(A);
  const allRat = (() => { const ps = parts.filter((p) => "tok" in p) as { tok: string }[]; return ps.length > 0 && ps.every((p) => rat(p.tok)); })(); const toks = parts.map((p, i) => ("tok" in p ? i : -1)).filter((i) => i >= 0);
  const val = (i: number) => rat((parts[i] as { tok: string }).tok);
  const rebuild = (f: (q: Rat) => string | null) => join(parts.map((p) => ("tok" in p ? { tok: (rat(p.tok) ? f(rat(p.tok)!) : null) ?? p.tok } : p)));
  const plainNumeric = ["integer", "fraction", "tuple", "matrix", "set", "roots", "exact", "ratio", "mixed", "interval"].includes(kind);
  // ---- equivalents: only forms that are the same mathematical object
  add("equiv", ` ${A} `, "credit"); if (A.includes("−")) add("equiv", A.replace(/−/g, "-"), "credit"); else if (/-\d/.test(A)) add("equiv", A.replace(/-/g, "−"), "credit");
  if (["exact", "expression", "antiderivative"].includes(kind)) {  // commutativity of addition: the same sum in reverse term order
    const noC = kind === "antiderivative" ? A.replace(/\s*\+\s*C\s*$/, "") : A; const ts = terms(noC);
    if (ts) { const r = sumOf([...ts].reverse()); if (r !== noC) add("equiv", kind === "antiderivative" && r !== noC ? r : r, "credit"); }
  }
  if (kind === "exact") { const sq = A.replace(/(?<![\w^/)√.])(\d+)√(\d+)(?![\d(])/g, (_m, a, m) => `√${BigInt(a) ** 2n * BigInt(m)}`); if (sq !== A) add("equiv", sq, "credit"); }  // a√m = √(a²m) for a > 0
  if (["integer", "fraction", "tuple", "set", "roots", "interval", "ratio"].includes(kind) && /\s/.test(A.trim()) && !/\b(or|and)\b/.test(A)) add("equiv", A.replace(/\s+/g, ""), "credit");
  if (kind === "interval" && /[≤≥]/.test(A)) add("equiv", A.replace(/≤/g, "<=").replace(/≥/g, ">="), "credit");
  if (kind === "antiderivative") { if (/\+\s*C\s*$/.test(A)) add("equiv", A.replace(/\s*\+\s*C\s*$/, ""), "credit"); else add("equiv", `${A} + C`, "credit"); }  // the answer is only defined up to an added constant
  if (["integer", "fraction", "tuple", "matrix", "set", "roots"].includes(kind) && allRat && !/\s\d+\/\d+$/.test(A)) {
    const d = rebuild((q) => dec(q)); if (d !== A) add("equiv", d, "credit");
    if (["integer", "tuple", "matrix", "set", "roots"].includes(kind) || toks.every((i) => val(i)!.d === 1n)) { const z = rebuild((q) => (q.d === 1n ? `${q.n}.0` : null)); if (z !== A) add("equiv", z, "credit"); }
    // an unreduced fraction is the same number; whether the question demands simplest form is policy, so it is tested separately
    const u = rebuild((q) => `${q.n * 2n}/${q.d * 2n}`); if (u !== A) add("equiv-policy", u, "credit");
  }
  if ((kind === "set" || kind === "roots") && toks.length >= 2 && allRat) { const vals = toks.map((i) => (parts[i] as { tok: string }).tok); const rev = [...vals].reverse(); let k = 0; add("equiv", join(parts.map((p) => ("tok" in p ? { tok: rev[k++] } : p))), "credit"); }
  if (kind === "integer" || kind === "fraction") { const q = rat(A); if (q) { if (q.n > 0n) add("equiv-policy", `+${show(q)}`, "credit"); } }
  // ---- wrong answers: a different mathematical object
  const q0 = allRat && toks.length === 1 ? val(toks[0]) : null;
  if (q0 && ["integer", "fraction"].includes(kind)) { add("wrong", show(mk(q0.n + q0.d, q0.d)), "no-credit", true); add("wrong", show(mk(q0.n - 2n * q0.d, q0.d)), "no-credit", true); if (q0.n !== 0n) add("wrong", show(mk(-q0.n, q0.d)), "no-credit", true); }
  else if (["tuple", "matrix", "set", "roots", "mixed", "ratio", "exact", "interval"].includes(kind)) {
    const nt = toks.filter((i) => val(i)); let f = nt[0];
    if ((kind === "set" || kind === "roots") && nt.length) { f = nt.reduce((a, b) => (val(a)!.n * val(b)!.d >= val(b)!.n * val(a)!.d ? a : b)); const q = val(f)!; add("wrong", join(parts.map((p, j) => (j === f ? { tok: show(mk(q.n + q.d, q.d)) } : p))), "no-credit", plainNumeric); const g = nt.find((i) => i !== f); if (g !== undefined) { const r = val(g)!; add("wrong", join(parts.map((p, j) => (j === g ? { tok: show(mk(q.n + 2n * q.d, q.d)) } : p))), "no-credit", false); void r; } f = undefined as unknown as number; }
    if (f !== undefined) { const q = val(f)!; add("wrong", join(parts.map((p, j) => (j === f ? { tok: show(mk(q.n + q.d, q.d)) } : p))), "no-credit", plainNumeric); }
    if (nt.length >= 2 && f !== undefined) { const l = nt[nt.length - 1], q = val(l)!; add("wrong", join(parts.map((p, j) => (j === l ? { tok: show(mk(q.n + 3n * q.d, q.d)) } : p))), "no-credit", plainNumeric); }
    if (nt.length === 0 && (kind === "set" || kind === "roots") && toks.length >= 2) add("wrong", join(parts.slice(0, toks[toks.length - 1] - 1)), "no-credit");
    if (f === undefined && !["set", "roots"].includes(kind)) {
      const m = A.match(/(?<![\^\w√])(\d+)(?![\d/])/); if (m && kind === "exact") add("wrong", A.replace(m[0], String(Number(m[1]) + 1)), "no-credit");
    }
  } else if (false) {} else if (kind === "expression") add("wrong", `(${A})+7`, "no-credit");
  else if (kind === "antiderivative") add("wrong", `(${A})+x`, "no-credit");
  if (["interval", "mixed", "ratio"].includes(kind) && !subs.some((x) => x.cat === "wrong")) { const m = A.match(/(?<![\w.])(\d+)(?![\d.]*\w)/); if (m && m.index !== undefined) add("wrong", A.slice(0, m.index) + String(Number(m[1]) + 1) + A.slice(m.index + m[1].length), "no-credit", true); }  // a different bound / whole part / ratio term
  // ---- ambiguous: hedging between the answer and a different one is not an answer
  if (["integer", "fraction"].includes(kind) && q0) { add("ambiguous", `${show(q0)} or ${show(mk(q0.n + q0.d, q0.d))}`, "no-credit"); add("ambiguous", `${show(q0)}, ${show(mk(q0.n + q0.d, q0.d))}`, "no-credit"); }
  else if (["set", "roots"].includes(kind) && allRat && toks.length >= 1) { const mx = toks.map((i) => val(i)!).reduce((a, b) => (a.n * b.d > b.n * a.d ? a : b)); const ex = show(mk(mx.n + mx.d, mx.d)); add("ambiguous", `${A}, ${ex}`, "no-credit"); }  // a hedge adds a further candidate: a different set (a repeated element would be the same set, so it is not tested)
  else na.push("ambiguous: no single-valued hedge defined for this answer type");
  // ---- unreadable / malformed / domain
  for (const u of ["", "???", "((", "1..2", ...(["exact", "expression", "antiderivative"].includes(kind) ? [] : ["abc"])]) add("unreadable", u, "unresolved");  // "abc" is a readable product of variables in algebra types
  if (["integer", "fraction", "exact", "tuple", "matrix"].includes(kind)) add("domain", "1/0", "unresolved"); else na.push("domain: no division-by-zero reading for this type");
  // ---- optional working never changes the answer's credit
  add("working-ok", A, "credit", false, ["1 + 1 = 3", "so I get something else"]);
  const w = subs.find((s) => s.cat === "wrong" && s.plain); if (w) add("working-wrong", w.resp, "no-credit", true, ["x = 1", "x + 0 = 1"]);
  void expanded;
  return { subs, na };
}
