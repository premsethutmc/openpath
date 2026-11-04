/**
 * PROTOTYPE (not production, not imported by anything): the proposed "conservation-preserving replacement" provenance rule.
 * A numeral introduced by a verified-equal rewrite is explained iff it sits in a maximal additive group (or equivalent-fraction term) that
 *   (1) is zero-sum-free   : no sub-multiset of the group's signed terms sums to 0 (no  +k -k  padding)            -> blocks add-zero laundering
 *   (2) is conserving      : every term not already explained belongs to a sub-multiset (size >= 2) whose signed sum is an explained value
 *   (3) is local           : the explained values are those of the expression being rewritten and its proper sub-expressions, never the value of the whole (the answer)
 * Soundness is untouched: value-equality of the lines is still decided by the exact kernel; this only classifies where a numeral came from.
 */
type N = { k: "n"; v: number } | { k: "b"; op: string; l: N; r: N };
const EPS = 1e-9, key = (x: number) => String(Math.round(x * 1e9) / 1e9);
function parse(src: string): N | null {
  const t = src.replace(/[−–]/g, "-").replace(/[×·]/g, "*").replace(/÷/g, "/").match(/\d+(?:\.\d+)?|[()+\-*/]/g); if (!t) return null; let i = 0;
  const atom = (): N | null => { const x = t[i++]; if (x === undefined) return null; if (/^\d/.test(x)) return { k: "n", v: Number(x) }; if (x === "(") { const e = sum(); return t[i++] === ")" ? e : null; } if (x === "-") { const a = atom(); return a && { k: "b", op: "-", l: { k: "n", v: 0 }, r: a }; } return null; };
  const prod = (): N | null => { let a = atom(); while (a && (t[i] === "*" || t[i] === "/")) { const op = t[i++]; const b = atom(); if (!b) return null; a = { k: "b", op, l: a, r: b }; } return a; };
  const sum = (): N | null => { let a = prod(); while (a && (t[i] === "+" || t[i] === "-")) { const op = t[i++]; const b = prod(); if (!b) return null; a = { k: "b", op, l: a, r: b }; } return a; };
  const e = sum(); return e && i === t.length ? e : null;
}
const val = (n: N): number => n.k === "n" ? n.v : ({ "+": val(n.l) + val(n.r), "-": val(n.l) - val(n.r), "*": val(n.l) * val(n.r), "/": val(n.l) / val(n.r) } as Record<string, number>)[n.op];
const terms = (n: N, s = 1): { node: N; sg: number }[] => n.k === "b" && n.op === "+" ? [...terms(n.l, s), ...terms(n.r, s)] : n.k === "b" && n.op === "-" ? [...terms(n.l, s), ...terms(n.r, -s)] : [{ node: n, sg: s }];
const leaves = (n: N): number[] => n.k === "n" ? [n.v] : [...leaves(n.l), ...leaves(n.r)];
function subsets<T>(a: T[], max = 8): T[][] { const o: T[][] = []; const m = Math.min(a.length, max); for (let b = 1; b < 1 << m; b++) o.push(a.slice(0, m).filter((_, j) => b & (1 << j))); return o; }
/** values visible in the expression being rewritten: its numerals, its fractions, its sub-expression values and its whole value */
function explainedBy(p: N): Set<string> { const X = new Set<string>(); const walk = (n: N, root: boolean) => { const quantity = n.k === "b" && n.op === "/" && n.l.k === "n" && n.r.k === "n"; /* a written fraction is one quantity, not a computation */ if (!(root && n.k === "b" && !quantity)) X.add(key(val(n))); if (n.k === "b") { walk(n.l, false); walk(n.r, false); } }; walk(p, true); return X; }  // the value of the WHOLE expression is the answer the task asks for: it never explains a numeral
/** returns the numerals of `rewritten` that the rule explains, or null with the reason it refuses */
export function explainNumerals(prev: string, rewritten: string): { ok: boolean; explained: number[]; why: string } {
  const P = parse(prev), R = parse(rewritten); if (!P || !R) return { ok: false, explained: [], why: "unparsed" };
  if (Math.abs(val(P) - val(R)) > EPS) return { ok: false, explained: [], why: "not equal (the kernel rejects this before provenance matters)" };
  const X = explainedBy(P), covered = new Set<number>(); let refusal = "";
  const group = (g: N) => {
    const ts = terms(g); const vs = ts.map((t) => t.sg * val(t.node));
    const lone = ts.length === 1; if (lone && ts[0].node.k === "b" && ts[0].node.op !== "/") { group2(ts[0].node); return; }   // a product: look inside its factors
    if (ts.length > 1) {
      for (const s of subsets(vs)) if (Math.abs(s.reduce((a, b) => a + b, 0)) < EPS) { refusal = "cancelling terms (+k −k): the numeral is a free parameter, not a decomposition"; return; }
      const sums = subsets(vs).filter((s) => s.length >= 2).map((s) => ({ s, tot: key(s.reduce((a, b) => a + b, 0)) }));
      ts.forEach((t, j) => {
        const v = vs[j], fracOk = t.node.k === "b" && t.node.op === "/" && X.has(key(val(t.node)));      // equivalent fraction of an explained value
        const inSum = sums.some(({ s, tot }) => s.includes(v) && X.has(tot));
        if (X.has(key(Math.abs(v))) || fracOk || inSum) leaves(t.node).forEach((x) => covered.add(x)); else if (!refusal) refusal = `term ${v} is neither visible in the rewritten expression nor part of a partition of a visible value`;
      });
    } else if (ts[0].node.k === "b" && ts[0].node.op === "/") { if (X.has(key(val(ts[0].node)))) leaves(ts[0].node).forEach((x) => covered.add(x)); else refusal ||= "fraction is not equivalent to a visible value"; }
    else covered.add(ts[0].node.k === "n" ? ts[0].node.v : NaN);
  };
  const group2 = (n: N) => { if (n.k === "n") { covered.add(n.v); return; } if (n.op === "+" || n.op === "-") { group(n); return; } if (n.op === "/") { group(n); return; } group2(n.l); group2(n.r); };
  group2(R);
  const nums = [...new Set(leaves(R))], explained = nums.filter((x) => covered.has(x) || X.has(key(x)));
  return refusal || explained.length < nums.length ? { ok: false, explained, why: refusal || "some numerals unexplained" } : { ok: true, explained, why: "every introduced numeral is a conserving part of a visible value" };
}
