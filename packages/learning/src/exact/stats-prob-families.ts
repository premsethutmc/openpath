/**
 * Exact checkers for existing statistics and probability families (Item 3). Same contract as number-families.ts:
 * the answer is re-derived from the learner-visible prompt (and its table, when the question shows one) only.
 * Probability is computed by exhaustive enumeration of the sample space with exact rationals (never by the
 * generators' counting formulas); statistics by direct definition on the expanded data.
 */
import { add, sub, mul, div, q, eq, type Q } from "./rational.ts";
import type { FamilyExact, Expected } from "./number-families.ts";

const ZERO = q(0n), ONE = q(1n);
const I = (s: string) => BigInt(s.replace(/−/g, "-"));
const sum = (xs: Q[]) => xs.reduce(add, ZERO);
const frac = (s: string) => { const m = s.replace(/−/g, "-").match(/^(-?\d+)(?:\/(\d+))?$/); return m ? q(BigInt(m[1]), BigInt(m[2] ?? 1)) : null; };
const num = (xs: bigint[]) => xs.map((x) => q(x));
const mean = (xs: Q[]) => div(sum(xs), q(BigInt(xs.length)));
const cmp = (a: Q, b: Q) => { const d = sub(a, b); return d.n < 0n ? -1 : d.n > 0n ? 1 : 0; };
const median = (xs: Q[]) => { const s = [...xs].sort(cmp); const n = s.length; return n % 2 ? s[(n - 1) / 2] : div(add(s[n / 2 - 1], s[n / 2]), q(2n)); };
const absQ = (a: Q) => (a.n < 0n ? q(-a.n, a.d) : a);
const dataOf = (p: string) => { const m = p.match(/the data ((?:-?\d+(?:, )?)+?)\./); return m ? m[1].split(", ").map((s) => q(I(s))) : null; };
const frac_ = (v: Q): Expected => ({ kind: "frac", q: v, lowest: false });
/** rows of a frequency table [x…] / [f…] (the table's own cells) */
const freqTable = (fig: any): { x: Q[]; f: Q[] } | null => {
  if (fig?.type !== "table" || fig.head?.[0] !== "x" || fig.rows?.length !== 1) return null;
  const x = fig.head.slice(1).map((s: string) => frac(String(s))), f = fig.rows[0].slice(1).map((s: string | number) => frac(String(s)));
  return x.some((v: Q | null) => !v) || f.some((v: Q | null) => !v) ? null : { x, f };
};
const expand = (t: { x: Q[]; f: Q[] }) => t.x.flatMap((x, i) => Array.from({ length: Number(t.f[i].n) }, () => x));
const variance = (xs: Q[]) => { const m = mean(xs); return mean(xs.map((x) => mul(sub(x, m), sub(x, m)))); };

// ---- enumeration helpers (exact) ------------------------------------------------------------
const combos = (n: number, k: number): number[][] => {
  const out: number[][] = []; const rec = (s: number, cur: number[]) => { if (cur.length === k) { out.push(cur); return; } for (let i = s; i < n; i++) rec(i + 1, [...cur, i]); }; rec(0, []); return out;
};
const prob = (total: number, fav: number) => q(BigInt(fav), BigInt(total));
const prime = (n: number) => { if (n < 2) return false; for (let d = 2; d * d <= n; d++) if (n % d === 0) return false; return true; };

export const STATS_PROB_FAMILIES: FamilyExact[] = [
  // ------------------------------- statistics -------------------------------------------------
  { id: "akmed", expected: (p) => { const m = p.match(/^Find the median of these numbers: (.+)\.$/); return m ? frac_(median(m[1].split(", ").map((s) => q(I(s))))) : null; } },
  { id: "avmiss", expected: (p) => {
      let m = p.match(/^The mean of five numbers is (-?\d+)\. Four of them are (.+?)\. What is the fifth number\?$/);
      if (m) { const o = m[2].split(", ").map((s) => q(I(s))); return o.length === 4 ? { kind: "int", q: sub(mul(q(5n), q(I(m[1]))), sum(o)) } : null; }
      m = p.match(/^The mean of five numbers is (-?\d+)\. Four of them are (.+?)\. The deviations from the mean \(value − mean\) of all five numbers add up to 0\. What is the deviation of the fifth number from the mean\? \(It may be negative\.\)$/);
      if (m) { const mu = q(I(m[1])); const o = m[2].split(", ").map((s) => q(I(s))); return o.length === 4 ? { kind: "int", q: sub(sub(mul(q(5n), mu), sum(o)), mu) } : null; }
      return null;
  } },
  { id: "avfmed", expected: (p, fig) => {
      if (!/What is the median\?$/.test(p) || fig?.type !== "table") return null;
      const rows = fig.rows.map((r: string[]) => [frac(String(r[0])), frac(String(r[1]))]); if (rows.some((r: (Q | null)[]) => !r[0] || !r[1])) return null;
      const md = median(expand({ x: rows.map((r: Q[]) => r[0]), f: rows.map((r: Q[]) => r[1]) }));
      return md.d === 1n ? { kind: "int", q: md } : frac_(md);
  } },
  { id: "atmdmean", expected: (p) => { const d = dataOf(p); if (!d || !/^Find the mean deviation about the mean/.test(p)) return null; const m = mean(d); return frac_(mean(d.map((x) => absQ(sub(x, m))))); } },
  { id: "atmdmed", expected: (p) => { const d = dataOf(p); if (!d || !/^Find the mean deviation about the median/.test(p)) return null; const m = median(d); return frac_(mean(d.map((x) => absQ(sub(x, m))))); } },
  { id: "atsd", expected: (p) => { const d = dataOf(p); return d && /^Find the standard deviation of the data/.test(p) ? { kind: "surd", v: variance(d) } : null; } },
  { id: "atvar", expected: (p, fig) => { const t = freqTable(fig); return t && /^Find the variance of the distribution/.test(p) ? frac_(variance(expand(t))) : null; } },
  { id: "anumean", expected: (p, fig) => { const t = freqTable(fig); return t && /^Find the mean of the frequency distribution/.test(p) ? frac_(mean(expand(t))) : null; } },
  { id: "atrvmean", expected: (p, fig) => { const d = rv(fig); return d && /Find the mean E\(X\)\.$/.test(p) ? frac_(sum(d.x.map((x, i) => mul(x, d.p[i])))) : null; } },
  { id: "atrvvar", expected: (p, fig) => {
      const d = rv(fig); if (!d || !/Find the variance Var\(X\)\.$/.test(p)) return null;
      const mu = sum(d.x.map((x, i) => mul(x, d.p[i]))); return frac_(sum(d.x.map((x, i) => mul(mul(sub(x, mu), sub(x, mu)), d.p[i]))));
  } },
  // ------------------------------- probability ------------------------------------------------
  { id: "akexp", expected: (p, fig) => {
      const m = p.match(/tossed|rolled|spun/) && p.match(/(\d+) times and recorded the results in the table\. Based on these results, what is the experimental probability of (?:getting a|rolling a|landing on) (\w+)\? \(A fraction is fine\.\)$/);
      if (!m || fig?.type !== "table") return null;
      const rows = fig.rows.map((r: (string | number)[]) => [String(r[0]).toLowerCase(), BigInt(r[1])]) as [string, bigint][];
      const tot = rows.reduce((a, r) => a + r[1], 0n); if (tot !== BigInt(m[1])) return null;       // the total in the sentence must match the table
      const hit = rows.filter((r) => r[0] === m[2].toLowerCase()); return hit.length === 1 ? { kind: "frac", q: q(hit[0][1], tot), lowest: true } : null;
  } },
  { id: "akchance", expected: (p, fig) => {
      const m = p.match(/What is the probability that it is (not )?([\w, ]+?)\? \(A fraction is fine\.\)$/); if (!m || fig?.type !== "table") return null;
      const rows = fig.rows.map((r: (string | number)[]) => [String(r[0]).toLowerCase(), BigInt(r[1])]) as [string, bigint][];
      const said = p.match(/^A bag has (.+?) marbles, as in the table\./);          // the sentence repeats the counts: they must match the table
      if (said) { const sc = [...said[1].matchAll(/(\d+) (\w+)/g)].map((x) => [x[2], BigInt(x[1])] as [string, bigint]); if (sc.length !== rows.length || sc.some((c, i) => c[0] !== rows[i][0] || c[1] !== rows[i][1])) return null; }
      const tot = rows.reduce((a, r) => a + r[1], 0n); const named = m[2].toLowerCase().split(/, | or /).filter(Boolean);   // "red, blue or green" is a union; a colour not in the table cannot be drawn
      const n = named.reduce((a, c) => a + (rows.find((r) => r[0] === c)?.[1] ?? 0n), 0n);
      return { kind: "frac", q: q(m[1] ? tot - n : n, tot), lowest: true };
  } },
  { id: "ancardn", expected: (p) => {
      const m = p.match(/^Cards numbered 1 to (\d+) are shuffled, and one card is drawn at random\. What is the probability that the number on it is (not )?(a multiple of (\d+)|a prime number|a perfect square)\?$/); if (!m) return null;
      const N = Number(m[1]); let fav = 0;
      for (let c = 1; c <= N; c++) { const t = m[4] ? c % Number(m[4]) === 0 : m[3] === "a prime number" ? prime(c) : [...Array(c + 1).keys()].some((r) => r * r === c); if (t !== !!m[2]) fav++; }
      return { kind: "frac", q: prob(N, fav), lowest: true };
  } },
  { id: "anbag", expected: (p) => {
      const m = p.match(/^A bag has (.+?) balls, all of the same size\. One ball is taken out without looking\. What is the probability that it is (\w+)\? Give a fraction\.$/); if (!m) return null;
      const cs = [...m[1].matchAll(/(\d+) (\w+)/g)].map((x) => [x[2], Number(x[1])] as [string, number]); const tot = cs.reduce((a, c) => a + c[1], 0);
      const hit = cs.filter((c) => c[0] === m[2]); return hit.length === 1 ? { kind: "frac", q: prob(tot, hit[0][1]), lowest: true } : null;
  } },
  { id: "antree", expected: (p) => {
      const m = p.match(/^A bag has (\d+) red and (\d+) blue counters\. Two counters are taken out one after the other, (without putting the first one back|putting the first one back before the second is taken)\. What is the probability that (both counters are red|both counters are blue|both counters are the same colour|one counter is red and the other is blue|at least one counter is red|at least one counter is blue)\? Give a fraction\.$/);
      if (!m) return null;
      const bag = [...Array(Number(m[1])).fill("R"), ...Array(Number(m[2])).fill("B")] as string[]; const repl = m[3].startsWith("putting");
      let fav = 0, tot = 0;
      for (let i = 0; i < bag.length; i++) for (let j = 0; j < bag.length; j++) {
        if (!repl && i === j) continue; tot++; const a = bag[i], b = bag[j];
        const ok = m[4] === "both counters are red" ? a === "R" && b === "R" : m[4] === "both counters are blue" ? a === "B" && b === "B" : m[4] === "both counters are the same colour" ? a === b : m[4] === "one counter is red and the other is blue" ? a !== b : m[4] === "at least one counter is red" ? a === "R" || b === "R" : a === "B" || b === "B";
        if (ok) fav++;
      }
      return { kind: "frac", q: prob(tot, fav), lowest: true };
  } },
  { id: "anncr", expected: (p) => {
      let m = p.match(/^A committee of (\d+) is chosen at random from (\d+) boys and (\d+) girls\. What is the probability that it has (no girls|exactly (\d+) girls?|at least one girl)\?$/); let tag = "G";
      if (!m) { m = p.match(/^A box has (\d+) good bulbs and (\d+) faulty bulbs\. (\d+) bulbs are taken out together at random\. What is the probability that exactly (\d+) of them (?:are|is) faulty\?$/); if (!m) return null; tag = "F"; }
      const people = tag === "G" ? [...Array(Number(m[2])).fill("b"), ...Array(Number(m[3])).fill("g")] : [...Array(Number(m[1])).fill("ok"), ...Array(Number(m[2])).fill("f")];
      const k = Number(tag === "G" ? m[1] : m[3]); const cs = combos(people.length, k); const special = tag === "G" ? "g" : "f";
      const want = tag === "G" ? m[4] : `exactly ${m[4]}`;
      const fav = cs.filter((c) => { const n = c.filter((i) => people[i] === special).length; return want === "no girls" ? n === 0 : want === "at least one girl" ? n >= 1 : n === Number(m![5] ?? m![4]); }).length;
      return { kind: "frac", q: prob(cs.length, fav), lowest: true };
  } },
  { id: "asaddp", expected: (p) => {
      const m = p.match(/^For two events A and B, P\(A\) = (\d+\/?\d*), P\(B\) = (\d+\/?\d*) and P\((A ∩ B|A ∪ B)\) = (\d+\/?\d*)\. Find P\((A ∩ B|A ∪ B|A′ ∩ B′|A ∩ B′)\)(?:, [^.]*)?\.$/); if (!m) return null;
      const PA = frac(m[1])!, PB = frac(m[2])!, g = frac(m[4])!; const both = m[3] === "A ∩ B" ? g : sub(add(PA, PB), g);
      const regions = [both, sub(PA, both), sub(PB, both), sub(ONE, sub(add(PA, PB), both))];     // A∩B, A only, B only, neither
      if (regions.some((r) => r.n < 0n) || !eq(sum(regions), ONE)) return null;                  // the data must describe a possible pair of events
      const ans = { "A ∩ B": regions[0], "A ∪ B": add(add(regions[0], regions[1]), regions[2]), "A′ ∩ B′": regions[3], "A ∩ B′": regions[1] }[m[5] as "A ∩ B"];
      return { kind: "frac", q: ans, lowest: true };
  } },
  { id: "asbayes", expected: (p) => {
      const shares = [...p.matchAll(/Machine ([A-C]) makes (\d+)%/g)]; const rates = [...p.matchAll(/(\d+)% of ([A-C])'s/g)]; const t = p.match(/made by machine ([A-C])\.$/);
      if (!t || shares.length < 2 || shares.length !== rates.length) return null;
      const w = shares.map((s) => { const r = rates.find((x) => x[2] === s[1]); return r ? { m: s[1], v: mul(q(I(s[2]), 100n), q(I(r[1]), 100n)) } : null; });
      if (w.some((x) => !x) || !eq(sum(shares.map((s) => q(I(s[2]), 100n))), ONE)) return null;
      const hit = w.find((x) => x!.m === t[1]); return hit ? { kind: "frac", q: div(hit.v, sum(w.map((x) => x!.v))), lowest: true } : null;
  } },
  ...(["astotp", "attotal"] as const).map((id): FamilyExact => ({ id, expected: (p) => {
      const m = p.match(/^A die is thrown\. If it shows (?:a )?([\d, or]+), a ball is drawn from Bag I, which has (\d+) red and (\d+) black balls; otherwise a ball is drawn from Bag II, which has (\d+) red and (\d+) black balls\. (The ball drawn is red\. Find the probability that it was drawn from Bag I|Find the probability that the ball drawn is red)\.$/);
      if (!m || (m[6].startsWith("The ball") !== (id === "astotp"))) return null;
      const faces = m[1].split(/, | or /).filter(Boolean).map(Number); if (faces.some((f, i) => f !== i + 1)) return null;
      // enumerate (face, ball): each face 1/6, each ball of the chosen bag equally likely
      let red = ZERO, redFromI = ZERO;
      for (let f = 1; f <= 6; f++) {
        const bag1 = f <= faces.length; const r = Number(bag1 ? m[2] : m[4]), b = Number(bag1 ? m[3] : m[5]);
        const pr = mul(q(1n, 6n), q(BigInt(r), BigInt(r + b))); red = add(red, pr); if (bag1) redFromI = add(redFromI, pr);
      }
      return { kind: "frac", q: id === "astotp" ? div(redFromI, red) : red, lowest: true };
  } })),
  { id: "asbinom", expected: (p) => {
      const m = p.match(/^X has a binomial distribution with n = (\d+) and p = (\d+)\/(\d+)\. Find P\(X (=|≥|≤) (\d+)\)\.$/); if (!m) return null;
      const n = Number(m[1]), pp = q(BigInt(m[2]), BigInt(m[3])), qq = sub(ONE, pp), k = Number(m[5]); let tot = ZERO;
      for (let bits = 0; bits < 1 << n; bits++) {            // every outcome of n independent trials
        let ones = 0, w = ONE; for (let i = 0; i < n; i++) { const s = (bits >> i) & 1; ones += s; w = mul(w, s ? pp : qq); }
        if (m[4] === "=" ? ones === k : m[4] === "≥" ? ones >= k : ones <= k) tot = add(tot, w);
      }
      return { kind: "frac", q: tot, lowest: true };
  } },
  { id: "asbinmv", expected: (p) => {
      let m = p.match(/^X has a binomial distribution with n = (\d+) and p = (\d+)\/(\d+)\. Find the mean and the variance of X\. Type them as \(mean, variance\)\.$/);
      const F = (v: Q) => (v.d === 1n ? `${v.n}` : `${v.n}/${v.d}`);
      if (m) {
        const n = Number(m[1]), pp = q(BigInt(m[2]), BigInt(m[3])), qq = sub(ONE, pp); let e1 = ZERO, e2 = ZERO;
        for (let bits = 0; bits < 1 << n; bits++) { let ones = 0, w = ONE; for (let i = 0; i < n; i++) { const s = (bits >> i) & 1; ones += s; w = mul(w, s ? pp : qq); } e1 = add(e1, mul(w, q(BigInt(ones)))); e2 = add(e2, mul(w, q(BigInt(ones * ones)))); }
        return { kind: "tuple", items: [F(e1), F(sub(e2, mul(e1, e1)))] };
      }
      m = p.match(/^A binomial random variable X has mean (\d+(?:\/\d+)?) and variance (\d+(?:\/\d+)?)\. Find n and p\. Type them as \(n, p\)\.$/);
      if (m) { const mu = frac(m[1])!, va = frac(m[2])!; const pp = sub(ONE, div(va, mu)); const n = div(mu, pp);       // np = mean, npq = variance
        if (n.d !== 1n || pp.n <= 0n || pp.n >= pp.d) return null; return { kind: "tuple", items: [F(n), F(pp)] }; }
      return null;
  } },
];
function rv(fig: any): { x: Q[]; p: Q[] } | null {
  if (fig?.type !== "table" || fig.head?.[0] !== "x" || fig.rows?.length !== 1) return null;
  const x = fig.head.slice(1).map((s: string) => frac(String(s))), pr = fig.rows[0].slice(1).map((s: string) => frac(String(s)));
  if (x.some((v: Q | null) => !v) || pr.some((v: Q | null) => !v) || !eq(sum(pr), ONE)) return null;   // a distribution must sum to exactly 1
  return { x, p: pr };
}
void num;
