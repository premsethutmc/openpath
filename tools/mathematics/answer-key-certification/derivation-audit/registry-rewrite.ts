/**
 * PROTOTYPE v2 (not production): a CLOSED REGISTRY of elementary, locally checkable rewrites. A line is a justified derivation step from `p` to `r` iff
 * `r` is obtained from `p` by disjoint applications of registered rewrites; each application is recoverable from the line's own visible structure plus
 * numerals already visible in `p`, WITHOUT evaluating the whole of `p` first.   Registry:
 *   identity/commute/associate   same terms or factors (compound terms recursively)
 *   evaluate                     a visible closed group of atoms -> its value (so "37+59 = 96" and "30+50 = 80" are evaluations)
 *   split (additive)             visible atom v -> parts summing to v (no zero part, no cancelling sub-multiset)      30+7 = 37
 *   split (multiplicative)       visible atom v -> factors with product v (no factor 1)                               6*8 = 48
 *   split into a group           factor/term v -> an additive group whose evaluation is v (recursive)                 12 -> (10+2)
 *   scale (fraction)             a/b -> ka/kb                                                                          1/2 -> 3/6
 *   distribute                   a*(b+c) -> ab + ac (all atoms)
 *   shifted transfer             terms a_i -> (a_i + s_i) with the shifts SHOWN and summing to 0                       (37+3)+(59-3)
 * NOT registered (so true-but-unsupported, never "invalid"): add/multiply-by-neutral, unshown equal-sum partitions (95+1, 40+56), parametric witnesses.
 */
type N = { k: "n"; v: number } | { k: "b"; op: string; l: N; r: N; g?: boolean };
const key = (x: number) => String(Math.round(x * 1e9) / 1e9);
function parse(src: string): N | null {
  const t = src.replace(/[−–]/g, "-").replace(/[×·]/g, "*").replace(/÷/g, "/").match(/\d+(?:\.\d+)?|[()+\-*/]/g); if (!t) return null; let i = 0;
  const atom = (): N | null => { const x = t[i++]; if (x === undefined) return null; if (/^\d/.test(x)) return { k: "n", v: Number(x) }; if (x === "(") { const e = sum(); if (t[i++] !== ")" || !e) return null; return e.k === "b" ? { ...e, g: true } : e; } return null; };
  const prod = (): N | null => { let a = atom(); while (a && (t[i] === "*" || t[i] === "/")) { const op = t[i++]; const b = atom(); if (!b) return null; a = { k: "b", op, l: a, r: b }; } return a; };
  const sum = (): N | null => { let a = prod(); while (a && (t[i] === "+" || t[i] === "-")) { const op = t[i++]; const b = prod(); if (!b) return null; a = { k: "b", op, l: a, r: b }; } return a; };
  const e = sum(); return e && i === t.length ? e : null;
}
const val = (n: N): number => n.k === "n" ? n.v : ({ "+": val(n.l) + val(n.r), "-": val(n.l) - val(n.r), "*": val(n.l) * val(n.r), "/": val(n.l) / val(n.r) } as Record<string, number>)[n.op];
type T = { n: N; s: number };
const isFrac = (n: N) => n.k === "b" && n.op === "/" && n.l.k === "n" && n.r.k === "n";
const isAtom = (n: N) => n.k === "n" || isFrac(n);
const addT = (n: N, s = 1): T[] => n.k === "b" && n.op === "+" ? [...addT(n.l, s), ...addT(n.r, s)] : n.k === "b" && n.op === "-" ? [...addT(n.l, s), ...addT(n.r, -s)] : [{ n, s }];
const addTg = (n: N, s = 1, top = true): T[] => n.k === "b" && (n.op === "+" || n.op === "-") && (top || !n.g) ? [...addTg(n.l, s, false), ...addTg(n.r, n.op === "+" ? s : -s, false)] : [{ n, s }];   // keeps parenthesised groups whole
const mulF = (n: N): N[] => n.k === "b" && n.op === "*" ? [...mulF(n.l), ...mulF(n.r)] : [n];
const canon = (n: N): string => { if (n.k === "n") return key(n.v); if (isFrac(n)) return `${key((n as any).l.v)}/${key((n as any).r.v)}`; if (n.op === "+" || n.op === "-") return "+[" + addT(n).map((t) => (t.s < 0 ? "-" : "") + canon(t.n)).sort().join(",") + "]"; if (n.op === "*") return "*[" + mulF(n).map(canon).sort().join(",") + "]"; return `(${canon(n.l)}${n.op}${canon(n.r)})`; };
const sv = (t: T) => t.s * val(t.n);
const subsets = <X,>(a: X[], min = 1): X[][] => { const o: X[][] = []; for (let b = 1; b < 1 << a.length; b++) { const s = a.filter((_, j) => b & (1 << j)); if (s.length >= min) o.push(s); } return o; };
const cancelling = (vs: number[]) => subsets(vs).some((s) => Math.abs(s.reduce((a, b) => a + b, 0)) < 1e-9);
const rm = <X,>(a: X[], rem: X[]) => { const c = [...a]; for (const x of rem) { const i = c.indexOf(x); if (i >= 0) c.splice(i, 1); } return c; };


/** shifted transfer, decided on the GROUPED terms of the new line: each old term a_i appears inside its own parenthesised group a_i + shift_i, shifts are shown atoms, and they sum to 0 */
function shiftTransfer(p: N, r: N): boolean {
  const P = addT(p), R = addTg(r); if (P.length < 2 || P.length > 4 || R.length !== P.length || !P.every((t) => isAtom(t.n))) return false;
  const used = new Set<number>(); let shifts = 0, shifted = 0;
  for (const t of P) {
    const hit = R.findIndex((c, j) => !used.has(j) && c.s === 1 && ((isAtom(c.n) && canon(c.n) === canon(t.n) && c.s === t.s) || (c.n.k === "b" && addT(c.n).some((q) => q.s === t.s && canon(q.n) === canon(t.n)) && addT(c.n).filter((q) => !(q.s === t.s && canon(q.n) === canon(t.n))).every((q) => isAtom(q.n)))));
    if (hit < 0) return false; used.add(hit); const d = sv(R[hit]) - sv(t); if (Math.abs(d) > 1e-9) { shifted++; shifts += d; }
  }
  return shifted >= 2 && Math.abs(shifts) < 1e-9;
}
function D(p: N, r: N): boolean {
  if (Math.abs(val(p) - val(r)) > 1e-9) return false;
  if (canon(p) === canon(r)) return true;
  if (isFrac(p) && isFrac(r)) { const [a, b, c, d] = [(p as any).l.v, (p as any).r.v, (r as any).l.v, (r as any).r.v]; const k = c / a; return Number.isInteger(k) && k > 1 && d === b * k; }
  if (shiftTransfer(p, r)) return true;
  if (p.k === "b" && p.op === "*" && r.k === "b" && (r.op === "+" || r.op === "-")) {                     // distribute a*(b+c)
    const f = mulF(p), g = f.filter((x) => x.k === "b" && (x.op === "+" || x.op === "-")), a = f.filter((x) => isAtom(x)); if (g.length === 1 && a.length === 1 && f.length === 2) {
      const want = addT(g[0]).map((t) => Math.round(t.s * val(t.n) * val(a[0]) * 1e9) / 1e9).sort(), got = addT(r).map((t) => Math.round(sv(t) * 1e9) / 1e9).sort(); return addT(r).every((t) => isAtom(t.n)) && want.join() === got.join(); } }
  const pAdd = p.k === "b" && (p.op === "+" || p.op === "-"), rAdd = r.k === "b" && (r.op === "+" || r.op === "-");
  if (pAdd || rAdd) return addMatch(addT(p), addT(r));
  if (p.k === "b" && p.op === "*" && r.k === "b" && r.op === "*") return mulMatch(mulF(p), mulF(r));
  if (isAtom(r) && p.k === "b" && p.op === "*" && mulF(p).every(isAtom)) return true;                    // evaluate a visible product
  return false;
}
function mulMatch(P: N[], R: N[]): boolean {
  if (!P.length) return !R.length; if (!R.length) return false; if (P.length > 5 || R.length > 6) return false; const p0 = P[0];
  for (const r of R) if (D(p0, r)) { if (mulMatch(P.slice(1), rm(R, [r]))) return true; }
  if (isAtom(p0)) for (const S of subsets(R, 2)) { const vs = S.map(val); if (S.every(isAtom) && vs.every((v) => v !== 1 && v !== 0) && Math.abs(vs.reduce((a, b) => a * b, 1) - val(p0)) < 1e-9 && mulMatch(P.slice(1), rm(R, S))) return true; }   // split into factors
  return false;
}
function addMatch(P: T[], R: T[]): boolean {
  if (!P.length) return !R.length; if (!R.length) return false; if (P.length > 6 || R.length > 8) return false; const p0 = P[0];
  for (const r of R) if (r.s === p0.s && D(p0.n, r.n) && (canon(p0.n) === canon(r.n) || val(p0.n) === val(r.n)) && addMatch(P.slice(1), rm(R, [r]))) return true;      // identity / same-value rewrite of one term
  if (isAtom(p0.n)) for (const S of subsets(R, 2)) {                                                                                            // additive split
    const vs = S.map(sv); if (S.every((t) => isAtom(t.n)) && vs.every((v) => v !== 0) && !cancelling(vs) && Math.abs(vs.reduce((a, b) => a + b, 0) - sv(p0)) < 1e-9 && addMatch(P.slice(1), rm(R, S))) return true; }
  for (const Sp of subsets(P, 2)) if (Sp.includes(p0) && Sp.every((t) => isAtom(t.n))) {                                                       // evaluate a visible group
    const tot = Sp.reduce((a, t) => a + sv(t), 0); for (const r of R) if (isAtom(r.n) && Math.abs(sv(r) - tot) < 1e-9 && addMatch(rm(P, Sp), rm(R, [r]))) return true;
    // shifted transfer: each p_i appears inside a compound r_i = p_i + shift_i; the shown shifts sum to 0
    const cands = R.filter((r) => r.n.k === "b" && addT(r.n).length > 1); if (cands.length >= Sp.length) for (const C of subsets(cands, Sp.length).filter((c) => c.length === Sp.length)) {
      const used = [...C]; let ok = true, shifts = 0; for (const t of Sp) { const hit = used.findIndex((c) => addT(c.n).some((q) => q.s * c.s === t.s && canon(q.n) === canon(t.n)) && addT(c.n).filter((q) => !(q.s * c.s === t.s && canon(q.n) === canon(t.n))).every((q) => isAtom(q.n))); if (hit < 0) { ok = false; break; } const c = used.splice(hit, 1)[0]; shifts += sv(c) - sv(t); }
      if (ok && Math.abs(shifts) < 1e-9 && C.every((c) => addT(c.n).every((q) => isAtom(q.n))) && addMatch(rm(P, Sp), rm(R, C))) return true; }
  }
  return false;
}
export function justified(prev: string, line: string): boolean { const p = parse(prev), r = parse(line); return !!p && !!r && D(p, r); }
