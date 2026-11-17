/**
 * deeper-calculus@1: the working a calculus question's own steps leave out, written per question type from the
 * question itself (its printed function is read with the same reader as a typed line, and worked with the powers-of-x
 * tools of deepen@1). Nothing here changes a question, its answer or its fingerprint: it only adds lines of help
 * between the question's first step and its last. A type whose question cannot be read gets nothing (never a guess).
 * `deeper-calculus.test.ts` checks every line that is a calculation, and that the working ends at the keyed answer.
 */
import { antiderivative, at, deepen, derivative, frac, substituted, sumText, termText, terms, tidy, type Finer, type Term } from "./deepen";
import { readExpression, variablesOf } from "./line-check";

interface Q { family: string; prompt: string; answer: string }
const poly = (text: string, v: string): Term[] | null => { const n = readExpression(text); const t = n && variablesOf(n).every((x) => x === v) ? terms(n, v) : null; return t && tidy(t); };
const num = (text: string): number => { const n = readExpression(text.replace(/−/g, "-")); if (!n || variablesOf(n).length) return NaN; const t = terms(n, "x"); return t ? at(t, 0) : NaN; };
const paren = (s: string | null) => (s && s.startsWith("−") ? `(${s})` : s);
/** Each term's derivative, then the whole: d/dt (t³) = 3t² … */
function eachDerivative(ts: Term[], v: string, name: string): Finer[] | null {
  const lines = ts.filter((t) => t.p !== 0).map((t) => { const a = termText(t, v), b = sumText(derivative([t]), v); return a && b ? `d/d${v} (${a}) = ${b}` : null; });
  const all = sumText(derivative(ts), v);
  if (lines.some((x) => !x) || !all) return null;
  return [...(lines as string[]).map((shown, i) => ({ next: `Differentiate the ${i === 0 ? "first" : "next"} term: bring the power down and lower it by one.`, shown })), ...(ts.some((t) => t.p === 0) ? [{ next: "What is the derivative of a number on its own?", shown: "A constant differentiates to 0" }] : []), { next: "Put the terms together.", shown: `${name} = ${all}` }];
}
const valueLine = (ts: Term[], v: string, x: number, name: string): Finer | null => { const s = substituted(ts, x), xs = frac(x); return s && xs ? { next: `Put ${xs} in for ${v}.`, shown: `${name} at ${v} = ${xs}: ${s}` } : null; };

type Handler = (q: Q) => Finer[] | null;
const HANDLERS: Record<string, Handler> = {
  // first principles: f(x + h) − f(x), divided by h, then h → 0
  aqfp: (q) => {
    const m = q.prompt.match(/for f\(x\) = (.+?)\.\s*$/), f = m && poly(m[1], "x");
    if (!f || f.some((t) => !Number.isInteger(t.p) || t.p < 0 || t.p > 3)) return null;
    // (x + h)ⁿ − xⁿ = Σ C(n, k) xⁿ⁻ᵏ hᵏ for k ≥ 1
    const C = (n: number, k: number) => { let r = 1; for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1); return r; };
    const two: { c: number; px: number; ph: number }[] = [];
    for (const t of f) for (let k = 1; k <= t.p; k++) two.push({ c: t.c * C(t.p, k), px: t.p - k, ph: k });
    two.sort((a, b) => a.ph - b.ph || b.px - a.px);
    const show = (xs: typeof two, drop: number) => xs.map((t, i) => { const c = frac(t.c), x = termText({ c: 1, p: t.px }, "x"), h = termText({ c: 1, p: t.ph - drop }, "h"); if (!c || x === null || h === null) return null; const vars = `${x === "1" ? "" : x}${h === "1" ? "" : h}`; const mag = c.replace("−", ""); const body = vars ? `${mag === "1" ? "" : mag}${vars}` : mag; return i === 0 ? `${c.startsWith("−") ? "−" : ""}${body}` : `${c.startsWith("−") ? "−" : "+"} ${body}`; });
    const diff = show(two, 0), over = show(two, 1), fx = sumText(f, "x"), d = sumText(derivative(f), "x");
    if (!fx || !d || diff.some((x) => x === null) || over.some((x) => x === null)) return null;
    const moved = f.filter((t) => t.p > 0).map((t) => termText(t, "X")).join(" + ").replace(/\+ −/g, "− ").replace(/X/g, "(x + h)");
    return [
      { next: "Write f(x + h): put (x + h) wherever x is.", shown: `f(x + h) = ${moved}${f.some((t) => t.p === 0) ? ` ${frac(f.find((t) => t.p === 0)!.c)!.startsWith("−") ? "−" : "+"} ${frac(Math.abs(f.find((t) => t.p === 0)!.c))}` : ""}` },
      { next: "Take f(x) away. Everything without an h cancels.", shown: `f(x + h) − f(x) = ${diff.join(" ")}` },
      { next: "Divide every term by h.", shown: `[f(x + h) − f(x)]/h = ${over.join(" ")}` },
      { next: "Let h become 0: every term that still has an h goes.", shown: `f′(x) = ${d}` },
    ];
  },
  // velocity: differentiate the distance, then put the time in
  aqvel: (q) => {
    const m = q.prompt.match(/is s = (.+?) metres.*at t = ([\d./−-]+)\./), s = m && poly(m[1], "t"), t0 = m ? num(m[2]) : NaN;
    const each = s && eachDerivative(s, "t", "v = ds/dt"), last = s && valueLine(derivative(s), "t", t0, "v");
    return each && last ? [...each, last] : null;
  },
  // marginal revenue (or cost): the derivative, then the number of items
  aqrr: (q) => {
    const m = q.prompt.match(/([RC])\(x\) = (.+?)\. Find the marginal .*? when x = ([\d./]+)\./), f = m && poly(m[2], "x"), x0 = m ? num(m[3]) : NaN;
    const each = f && eachDerivative(f, "x", `${m![1]}′(x)`), last = f && valueLine(derivative(f), "x", x0, `${m![1]}′(x)`);
    return each && last ? [...each, last] : null;
  },
  // continuity with an unknown k: the known piece's value at the point, then solve for k
  aqcontk: (q) => {
    const m = q.prompt.match(/f\(x\) = (.+?) for x [≤<≥>] ([\d./−-]+), and f\(x\) = (.+?) for x [≤<≥>] [\d./−-]+\. Find the value of k/);
    if (!m) return null;
    const a = num(m[2]), [withK, known] = /k/.test(m[1]) ? [m[1], m[3]] : [m[3], m[1]];
    const g = poly(known, "x");
    if (!g || !Number.isFinite(a)) return null;
    // the piece with k, at x = a, is A·k + B (first degree in k)
    const B = (() => { const e = readExpression(withK.replace(/x/g, `(${a})`)); return e && variablesOf(e).every((x) => x === "k") ? terms(e, "k") : null; })();
    const kt = B && tidy(B);
    if (!kt || kt.some((t) => t.p !== 0 && t.p !== 1) || !kt.some((t) => t.p === 1)) return null;
    const A = kt.find((t) => t.p === 1)!.c, b0 = kt.find((t) => t.p === 0)?.c ?? 0, want = at(g, a);
    const left = sumText(kt, "k"), gv = substituted(g, a), as = frac(a), w = frac(want), rhs = frac(want - b0), k = frac((want - b0) / A), Ak = termText({ c: A, p: 1 }, "k");
    if (!left || !gv || !as || !w || !rhs || !k || !Ak) return null;
    return [
      { next: `Work out the piece without k at x = ${as}.`, shown: `${known} at x = ${as}: ${gv}` },
      { next: `Write the piece with k at x = ${as}.`, shown: `${withK} at x = ${as} is ${left}` },
      { next: "For no break in the graph the two must be equal.", shown: `${left} = ${w}` },
      ...(b0 !== 0 ? [{ next: "Move the number to the other side.", shown: `${Ak} = ${rhs}` }] : []),
      ...(A !== 1 ? [{ next: "Divide by the number in front of k.", shown: `k = ${k}` }] : []),
    ];
  },
  // concavity: y″, where it is zero, and its sign in each interval
  aqconc: (q) => {
    const m = q.prompt.match(/curve y = (.+?) is concave (upward|downward)/), y = m && poly(m[1], "x");
    if (!y) return null;
    const d1 = derivative(y), d2 = derivative(d1), t1 = sumText(d1, "x"), t2 = sumText(d2, "x");
    if (!t1 || !t2 || d2.length === 0 || d2[0].p > 2) return null;
    const A = d2.find((t) => t.p === 2)?.c ?? 0, B = d2.find((t) => t.p === 1)?.c ?? 0, C0 = d2.find((t) => t.p === 0)?.c ?? 0;
    const roots = A ? (() => { const D = B * B - 4 * A * C0; return D < 0 ? [] : D === 0 ? [-B / (2 * A)] : [(-B - Math.sqrt(D)) / (2 * A), (-B + Math.sqrt(D)) / (2 * A)].sort((a, b) => a - b); })() : B ? [-C0 / B] : [];
    if (roots.some((r) => frac(r) === null)) return null;
    const probes = roots.length ? [roots[0] - 1, ...roots.slice(1).map((r, i) => (r + roots[i]) / 2), roots[roots.length - 1] + 1] : [0];
    const signs = probes.map((x) => { const v = frac(at(d2, x)), xs = frac(x); return v && xs ? { next: `Try a value of x ${roots.length ? "in the next interval" : ""}: is y″ above or below zero there?`.replace("  ", " "), shown: `At x = ${xs}: y″ = ${v}, which is ${at(d2, x) > 0 ? "positive (concave upward)" : "negative (concave downward)"}` } : null; });
    if (signs.some((x) => !x)) return null;
    return [
      { next: "Differentiate once, term by term.", shown: `y′ = ${t1}` },
      { next: "Differentiate again.", shown: `y″ = ${t2}` },
      ...(roots.length ? [{ next: "Find where y″ is zero: the curve can change its bend only there.", shown: `y″ = 0 at x = ${roots.map((r) => frac(r)).join(" and ")}` }] : []),
      ...(signs as Finer[]),
    ];
  },
  // differentiable at a join: equal slopes give a, equal values give b
  aqdiffab: (q) => {
    const m = q.prompt.match(/f\(x\) = (.+?) for x [<≤] ([\d./−-]+), and f\(x\) = (.+?) for x [≥>] [\d./−-]+\. Find a and b/);
    if (!m) return null;
    const c = num(m[2]), [unknown, known] = /a/.test(m[1]) ? [m[1], m[3]] : [m[3], m[1]];
    const g = poly(known, "x"), u = unknown.match(/^x² ([+−]) ax ([+−]) b$/);
    if (!g || !u || !Number.isFinite(c)) return null;
    const sa = u[1] === "+" ? 1 : -1, sb = u[2] === "+" ? 1 : -1, slope = at(derivative(g), c), value = at(g, c), a = (slope - 2 * c) / sa, b = (value - c * c - sa * a * c) / sb;
    const gs = sumText(derivative(g), "x") ?? "", cs = frac(c), f = (x: number) => frac(x);
    if (!cs || [slope, value, a, b, 2 * c, c * c, sa * a * c].some((x) => f(x) === null)) return null;
    return [
      { next: "Differentiate the piece with a and b.", shown: `d/dx (x² ${u[1]} ax ${u[2]} b) = 2x ${u[1]} a` },
      { next: `Differentiate the other piece and find its slope at x = ${cs}.`, shown: `d/dx (${known}) = ${gs}, which is ${f(slope)} at x = ${cs}` },
      { next: `The slopes must be equal at x = ${cs}.`, shown: `${f(2 * c)} ${u[1]} a = ${f(slope)}, so a = ${f(a)}` },
      { next: `The values must be equal at x = ${cs} too.`, shown: `${f(c * c)} ${sa * a * c < 0 ? "−" : "+"} ${f(Math.abs(sa * a * c))} ${u[2]} b = ${f(value)}, so b = ${f(b)}` },
    ];
  },
  // a limit at infinity of a ratio of polynomials: divide by the highest power
  auliinf: (q) => {
    const m = q.prompt.match(/lim \(x → ∞\) of \((.+?)\)\/\((.+?)\)\./), top = m && poly(m[1], "x"), bot = m && poly(m[2], "x");
    if (!top || !bot || !top.length || !bot.length) return null;
    const n = Math.max(top[0].p, bot[0].p), div = (ts: Term[]) => sumText(ts.map((t) => ({ c: t.c, p: t.p - n })), "x")?.replace(/x\^\(−(\d+)\)/g, (_m, k: string) => (k === "1" ? "/x" : `/x${"⁰¹²³⁴⁵⁶⁷⁸⁹"[Number(k)]}`)).replace(/(^|[\s(])\/x/g, "$11/x");
    const a = top.find((t) => t.p === n)?.c ?? 0, b = bot.find((t) => t.p === n)?.c ?? 0, tt = div(top), bb = div(bot), pw = termText({ c: 1, p: n }, "x"), v = b ? frac(a / b) : null;
    if (!tt || !bb || !pw || !v) return null;
    return [
      { next: `Divide every term, top and bottom, by ${pw} (the highest power).`, shown: `(${tt})/(${bb})` },
      { next: "As x grows without end, what happens to a number divided by x?", shown: "Every term with x underneath goes to 0" },
      { next: "Write what is left.", shown: `${frac(a)}/${frac(b)}` === v ? `The limit is ${v}` : `${frac(a)}/${frac(b)} = ${v}` },
    ];
  },
};

// ---------------------------------------------------------------- the rules: chain, quotient, parts, tables
const SUPN: Record<string, number> = { "²": 2, "³": 3, "⁴": 4, "⁵": 5, "⁶": 6, "⁷": 7, "⁸": 8, "⁹": 9 };
const sup = (n: number) => (n === 1 ? "" : n >= 2 && n <= 9 ? "⁰¹²³⁴⁵⁶⁷⁸⁹"[n] : `^${n}`);
const times = (a: Term[], b: Term[]) => tidy(a.flatMap((x) => b.map((y) => ({ c: x.c * y.c, p: x.p + y.p }))));
const minus = (a: Term[], b: Term[]) => tidy([...a, ...b.map((t) => ({ c: -t.c, p: t.p }))]);
/** The parts of a sum at its top level: "5e^(4x) + log x" → ["5e^(4x)", "+log x"]. */
function addends(s: string): string[] {
  const out: string[] = [];
  let depth = 0, cur = "";
  for (const ch of s.trim()) {
    if (ch === "(") depth++; if (ch === ")") depth--;
    if (depth === 0 && (ch === "+" || ch === "−") && cur.trim()) { out.push(cur.trim()); cur = ch === "−" ? "−" : ""; } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
const coef = (s: string): [number, string] => { const m = s.replace(/\s+/g, " ").match(/^(−?)\s*(\d+(?:\/\d+)?)?\s*(.*)$/)!; const c = (m[1] ? -1 : 1) * (m[2] ? num(m[2]) : 1); return [c, m[3].trim()]; };
const withCoef = (c: number, body: string): string | null => { const f = frac(c); if (!f) return null; if (c === 0) return "0"; const mag = f.replace("−", ""); return `${c < 0 ? "−" : ""}${mag === "1" && body ? "" : mag.includes("/") ? `(${mag})` : mag}${body}`; };
const joined = (parts: string[]) => parts.map((p, i) => (i === 0 ? p : p.startsWith("−") ? `− ${p.slice(1)}` : `+ ${p}`)).join(" ");
/** The standard derivatives and integrals of one function of x (or of ax): [what it becomes, the number it brings]. */
const D_TABLE: [RegExp, (k: number) => [string, number]][] = [
  [/^sin\s*\(?(\d*)x\)?$/, (k) => [`cos${k === 1 ? " x" : `(${k}x)`}`, k]], [/^cos\s*\(?(\d*)x\)?$/, (k) => [`sin${k === 1 ? " x" : `(${k}x)`}`, -k]],
  [/^e(?:\^\(?(\d*)x\)?|ˣ)$/, (k) => [k === 1 ? "e^x" : `e^(${k}x)`, k]], [/^log\s*\(?(\d*)x\)?$/, () => ["1/x", 1]], [/^tan\s*\(?(\d*)x\)?$/, (k) => [`sec²${k === 1 ? " x" : `(${k}x)`}`, k]],
];
const I_TABLE: [RegExp, (k: number) => [string, number]][] = [
  [/^sin\s*\(?(\d*)x\)?$/, (k) => [`cos${k === 1 ? " x" : `(${k}x)`}`, -1 / k]], [/^cos\s*\(?(\d*)x\)?$/, (k) => [`sin${k === 1 ? " x" : `(${k}x)`}`, 1 / k]],
  [/^e(?:\^\(?(\d*)x\)?|ˣ)$/, (k) => [k === 1 ? "e^x" : `e^(${k}x)`, 1 / k]], [/^sec²\s*\(?(\d*)x\)?$/, (k) => [`tan${k === 1 ? " x" : `(${k}x)`}`, 1 / k]],
  [/^sec x tan x$/, () => ["sec x", 1]], [/^1\/x$/, () => ["log|x|", 1]],
];
/** One addend differentiated or integrated: a power of x by the power rule, a standard function from the table. */
function one(add: string, table: typeof D_TABLE, power: (t: Term[]) => Term[] | null): { from: string; to: string } | null {
  const p = poly(add, "x");
  if (p) { const r = power(p), a = sumText(p, "x"), b = r && sumText(r, "x"); return a && b ? { from: a, to: b } : null; }
  const [c, body] = coef(add);
  for (const [re, f] of table) {
    const m = body.match(re);
    if (!m) continue;
    const [to, k] = f(m[1] ? Number(m[1]) : 1), total = c * k, tf = frac(total);
    if (!tf) return null;
    // a number over x is written 6/x, not 6(1/x)
    const out = to.startsWith("1/") ? (Math.abs(total) === 1 ? `${total < 0 ? "−" : ""}${to}` : `${tf}${to.slice(1)}`) : withCoef(total, to);
    return out ? { from: add.replace(/^−\s*/, "−"), to: out } : null;
  }
  return null;
}
Object.assign(HANDLERS, {
  // the chain rule: name the inside, differentiate inside and outside, multiply
  audch: (q: Q) => {
    const pw = q.prompt.match(/y = \((.+?)\)([²³⁴⁵⁶⁷⁸⁹]) with/), fn = q.prompt.match(/y = (sin|cos|tan|log)\((.+?)\) with/), ex = q.prompt.match(/y = e\^\((.+?)\) with/);
    const inner = (pw ?? fn ?? ex)?.[pw ? 1 : fn ? 2 : 1], u = inner ? poly(inner, "x") : null, du = u && sumText(derivative(u), "x");
    if (!inner || !u || !du) return null;
    const n = pw ? SUPN[pw[2]] : 0;
    const [outer, dOuter, dAt] = pw ? [`u${sup(n)}`, `${n}u${sup(n - 1)}`, `${n}(${inner})${sup(n - 1)}`]
      : ex ? ["e^u", "e^u", `e^(${inner})`]
      : fn![1] === "sin" ? ["sin u", "cos u", `cos(${inner})`] : fn![1] === "cos" ? ["cos u", "−sin u", `−sin(${inner})`] : fn![1] === "tan" ? ["tan u", "sec² u", `sec²(${inner})`] : ["log u", "1/u", `1/(${inner})`];
    return [
      { next: "Name the inside: call it u.", shown: `u = ${inner}, so y = ${outer}` },
      { next: "Differentiate the inside.", shown: `du/dx = ${du}` },
      { next: "Differentiate the outside, treating u as one thing.", shown: `dy/du = ${dOuter}` },
      { next: "Multiply the two, and put the inside back for u.", shown: `dy/dx = ${dAt} × ${/[+−]/.test(du.slice(1)) ? `(${du})` : du}` },
    ];
  },
  // the quotient rule for one polynomial over another
  audquo: (q: Q) => {
    const m = q.prompt.match(/y = \((.+?)\)\/\((.+?)\) with/), u = m && poly(m[1], "x"), v = m && poly(m[2], "x");
    if (!u || !v) return null;
    const du = derivative(u), dv = derivative(v), topT = minus(times(v, du), times(u, dv));
    const [us, vs, dus, dvs, top] = [sumText(u, "x"), sumText(v, "x"), sumText(du, "x"), sumText(dv, "x"), sumText(topT, "x")];
    if (!us || !vs || !dus || !dvs || !top) return null;
    return [
      { next: "Name the top u and differentiate it.", shown: `u = ${us}, so u′ = ${dus}` },
      { next: "Name the bottom v and differentiate it.", shown: `v = ${vs}, so v′ = ${dvs}` },
      { next: "Work out the top of the rule: v u′ − u v′.", shown: `(${vs})(${dus}) − (${us})(${dvs}) = ${top}` },
      { next: "Put it over the bottom squared.", shown: `dy/dx = ${/[+−]/.test(top.slice(1)) ? `(${top})` : top}/(${vs})²` },
    ];
  },
  // e^(ax) and log x, term by term
  audel: (q: Q) => {
    const m = q.prompt.match(/y = (.+?) with respect/), parts = m ? addends(m[1]).map((a) => one(a, D_TABLE, derivative)) : [];
    if (!parts.length || parts.some((x) => !x)) return null;
    return [...parts.map((x, i) => ({ next: `Differentiate the ${i === 0 ? "first" : "next"} term on its own.`, shown: `d/dx (${x!.from.replace(/^−/, "")}) = ${x!.to.replace(/^−/, "")}`.replace(/\((\d+)\(/, "($1(") })), { next: "Put the terms together, keeping each sign.", shown: `dy/dx = ${joined(parts.map((x) => x!.to))}` }];
  },
  // standard integrals, term by term
  austd: (q: Q) => {
    const m = q.prompt.match(/∫ \((.+)\) dx\./), parts = m ? addends(m[1]).map((a) => one(a, I_TABLE, antiderivative)) : [];
    if (!parts.length || parts.some((x) => !x)) return null;
    return [...parts.map((x, i) => ({ next: `Integrate the ${i === 0 ? "first" : "next"} term on its own.`, shown: `∫ ${x!.from} dx = ${x!.to}` })), { next: "Put the terms together and add the constant.", shown: `${joined(parts.map((x) => x!.to))} + C` }];
  },
  // ∫ f(ax + b) dx: integrate as if the bracket were x, then divide by a
  aulax: (q: Q) => {
    const pw = q.prompt.match(/∫ \((.+?)\)([²³⁴⁵⁶⁷⁸⁹]) dx/), fn = q.prompt.match(/∫ (sin|cos)\((.+?)\) dx/), ex = q.prompt.match(/∫ e\^\((.+?)\) dx/);
    const inner = (pw ?? fn ?? ex)?.[pw ? 1 : fn ? 2 : 1], u = inner ? poly(inner, "x") : null;
    if (!inner || !u || u.some((t) => t.p > 1) || !u.some((t) => t.p === 1)) return null;
    const a = u.find((t) => t.p === 1)!.c, as = frac(a), n = pw ? SUPN[pw[2]] : 0;
    const [of, F, coefF, Fx] = pw ? [`u${sup(n)}`, `u${sup(n + 1)}/${n + 1}`, 1 / (a * (n + 1)), `(${inner})${sup(n + 1)}`] : ex ? ["e^u", "e^u", 1 / a, `e^(${inner})`] : fn![1] === "sin" ? ["sin u", "−cos u", -1 / a, `cos(${inner})`] : ["cos u", "sin u", 1 / a, `sin(${inner})`];
    const last = withCoef(coefF, Fx);
    if (!as || !last) return null;
    return [
      { next: "Name the bracket u, and integrate as if u were x.", shown: `u = ${inner}; ∫ ${of} du = ${F}` },
      { next: "Differentiate the bracket: what number comes out?", shown: `du/dx = ${as}` },
      { next: `That ${as} would appear on differentiating back, so divide by it.`, shown: `${last} + C` },
    ];
  },
  // by parts: x times e^(ax), sin(ax) or cos(ax)
  auparts: (q: Q) => {
    const m = q.prompt.match(/∫ (\d*)x (e\^|sin|cos)\((\d*)x\) dx/);
    if (!m) return null;
    const c = m[1] ? Number(m[1]) : 1, a = m[3] ? Number(m[3]) : 1, ax = a === 1 ? "x" : `${a}x`;
    const [dv, vBody, vC, iBody, iC] = m[2] === "e^" ? [`e^(${ax})`, `e^(${ax})`, 1 / a, `e^(${ax})`, 1 / (a * a)] : m[2] === "sin" ? [`sin(${ax})`, `cos(${ax})`, -1 / a, `sin(${ax})`, -1 / (a * a)] : [`cos(${ax})`, `sin(${ax})`, 1 / a, `cos(${ax})`, -1 / (a * a)];
    const v = withCoef(vC, vBody), uv = withCoef(c * vC, `x ${vBody}`), rest = withCoef(-c * iC, iBody), cx = withCoef(c, "x");
    if (!v || !uv || !rest || !cx) return null;
    return [
      { next: "Choose u (the part that gets simpler when differentiated) and dv (the rest).", shown: `u = ${cx} and dv = ${dv} dx` },
      { next: "Differentiate u and integrate dv.", shown: `du = ${frac(c)} dx and v = ${v}` },
      { next: "Use ∫ u dv = uv − ∫ v du. Write uv first.", shown: `uv = ${uv}` },
      { next: "Integrate v du and take it away.", shown: `${joined([uv, rest])} + C` },
    ];
  },
  // a partial derivative: the other letter is held still, like a number
  arpartial: (q: Q) => {
    const m = q.prompt.match(/f\(x, y\) = (.+?), find ∂f\/∂([xy])\./);
    if (!m) return null;
    const v = m[2], other = v === "x" ? "y" : "x";
    const lines = addends(m[1]).map((a) => {
      const t = a.replace(/\s+/g, "").match(/^(−?)(\d*)(x[²³⁴⁵⁶⁷⁸⁹]?)?(y[²³⁴⁵⁶⁷⁸⁹]?)?$/);
      if (!t) return null;
      const c = (t[1] ? -1 : 1) * (t[2] ? Number(t[2]) : 1), px = t[3] ? SUPN[t[3][1]] ?? 1 : 0, py = t[4] ? SUPN[t[4][1]] ?? 1 : 0, [pv, po] = v === "x" ? [px, py] : [py, px];
      const still = po ? `${other}${sup(po)}` : "";
      const to = pv === 0 ? "0" : withCoef(c * pv, v === "x" ? `${pv > 1 ? `x${sup(pv - 1)}` : ""}${still}` : `${still}${pv > 1 ? `y${sup(pv - 1)}` : ""}`);
      return to ? { from: a.replace(/^−\s*/, "−"), to: to === "" ? frac(c * pv)! : to, still: !!po && pv > 0 } : null;
    });
    if (!lines.length || lines.some((x) => !x)) return null;
    return [...lines.map((x, i) => ({ next: `Differentiate the ${i === 0 ? "first" : "next"} term with respect to ${v}, holding ${other} still like a number.`, shown: `∂/∂${v} (${x!.from}) = ${x!.to}${x!.to === "0" ? ` (no ${v} in it)` : ""}` })), { next: "Put the terms together.", shown: `∂f/∂${v} = ${joined(lines.filter((x) => x!.to !== "0").map((x) => x!.to))}` }];
  },
} as Record<string, Handler>);

// the area between a curve (or a line), the x-axis and two upright lines: the size of y, integrated between them
const areaBetween: Handler = (q) => {
  const m = q.prompt.match(/(?:curve|line) y = (.+?), the x-axis and the lines x = ([\d./−-]+) and x = ([\d./−-]+)\./);
  return m ? deepen(`∫ from ${m[2]} to ${m[3]} of |${m[1]}| dx`) : null;
};
Object.assign(HANDLERS, { aqarea: areaBetween, aqlarea: areaBetween } as Record<string, Handler>);

/** The working between a calculus question's first step and its last; empty when there is none to add. */
export function deeperCalculus(q: Q): Finer[] {
  try {
    const own = HANDLERS[q.family]?.(q);
    if (own?.length) return own;
  } catch (e) { if (typeof process !== "undefined" && process.env.DEEPER_DEBUG) console.error(q.family, e); /* a question that cannot be read gets no extra help */ }
  // a definite integral printed in the question itself (∫ from 1 to 2 of … dx): worked between its limits
  return /∫/.test(q.prompt) ? deepen(q.prompt.replace(/\bEvaluate\b|\bFind\b/g, "")) : [];
}
