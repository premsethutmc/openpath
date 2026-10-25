import { Rational } from "../claim-kit";
import type { ClaimTable, Claim, Problem } from "../claim-kit";

const num = (x: unknown): number | null => (typeof x === "number" && Number.isFinite(x) ? x : null);
const frac = (s: string): Rational | null => {
  const m = s.trim().match(/^(\d+)\s*\/\s*(\d+)$/);
  return m && BigInt(m[2]) > 0n ? new Rational(BigInt(m[1]), BigInt(m[2])) : null;
};

/** adfcmpu: the prompt "Which fraction is smaller/greater: a/b or c/d?" (or the word form "less/more") names two fractions;
 *  the stated value must be the smaller/greater one. Inputs (numerators over a common bottom) are not used. */
const adfcmpu = {
  check: (s, p) => {
    const fs = [...p.prompt.matchAll(/(\d+)\/(\d+)/g)];
    if (fs.length !== 2 || typeof s.value !== "string") return null;
    const f = fs.map((m) => frac(m[0]));
    if (!f[0] || !f[1] || f[0].eq(f[1])) return null;
    const small = /\b(smaller|less)\b/.test(p.prompt), big = /\b(greater|more|bigger|larger)\b/.test(p.prompt);
    if (small === big) return null;
    const want = (f[0].lt(f[1]) ? small : !small) ? 0 : 1;
    // the stated value must be written exactly as that fraction of the prompt
    return s.value.trim() === fs[want][0];
  },
} as { check: (s: any, p: Problem) => boolean | null };

/** avlike: the options are pairs "x/d and y/e"; exactly one pair has equal bottoms. The stated value must be that pair
 *  (an element of problem.options) and its two bottoms must be equal. */
const avlike = {
  check: (s, p) => {
    if (!p.options || typeof s.value !== "string") return null;
    const pairs = p.options.map((o) => o.match(/^(\d+)\/(\d+) and (\d+)\/(\d+)$/));
    if (pairs.some((m) => !m)) return null;
    const like = pairs.filter((m) => m![2] === m![4]);
    if (like.length !== 1) return null;
    return s.value === like[0]![0];
  },
} as { check: (s: any, p: Problem) => boolean | null };

/** ajbest: the prompt gives two packs "n items for ₹T" / "n kg bag costs ₹T"; the stated value is the lower price per item. */
const ajbest: Claim = (_s, p) => {
  const amounts = [...p.prompt.matchAll(/₹(\d+)/g)].map((m) => BigInt(m[1]));
  const counts = [...p.prompt.matchAll(/(\d+)\s*(?:soaps|kg)\b/g)].map((m) => BigInt(m[1]));
  if (amounts.length !== 2 || counts.length !== 2 || counts.some((c) => c === 0n)) return null;
  const u = new Rational(amounts[0], counts[0]), w = new Rational(amounts[1], counts[1]);
  return u.lt(w) ? u : w;
};

/** anquad: width x, length x + d, area A (read from the prompt): the width is the positive root of x^2 + d x - A = 0,
 *  x = (-d + sqrt(d^2 + 4A)) / 2 (the other root is negative and rejected). */
const anquad: Claim = (_s, p) => {
  const d = p.prompt.match(/(\d+)\s*c?m (?:more|taller)/), A = p.prompt.match(/(\d+)\s*c?m²/);
  if (!d || !A) return null;
  const D = BigInt(d[1]), disc = D * D + 4n * BigInt(A[1]);
  let r = BigInt(Math.floor(Math.sqrt(Number(disc))));
  while (r * r > disc) r--;
  while ((r + 1n) * (r + 1n) <= disc) r++;
  if (r * r !== disc || r <= D) return null;
  return new Rational(r - D, 2n);
};

/** aeangk: params [mode, v]: the angle is 5v degrees; the stated value is the index into problem.options of its name. */
const aeangk = {
  check: (s, p) => {
    const v = num(p.params[1]), idx = num(s.value);
    if (v === null || !p.options || !Number.isInteger(v) || v < 1 || v > 71) return null;
    const d = 5 * v;
    const name = d < 90 ? "acute" : d === 90 ? "right" : d < 180 ? "obtuse" : d === 180 ? "straight" : "reflex";
    if (idx === null) return false;
    if (p.options.filter((o) => o === name).length !== 1) return null;
    return p.options[idx] === name;
  },
} as { check: (s: any, p: Problem) => boolean | null };

export const CLAIMS: ClaimTable = {
  "adfcmpu/compare": adfcmpu,
  "avlike/compare": avlike,
  "ajbest/compare": ajbest,
  "anquad/compare": anquad,
  "aeangk/compare": aeangk,
};
