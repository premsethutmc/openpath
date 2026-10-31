/** Exact rational arithmetic on BigInt. Independent of the family generators, the kernel and floating point. */
export interface Q { readonly n: bigint; readonly d: bigint }
const abs = (x: bigint) => (x < 0n ? -x : x);
export function gcdB(a: bigint, b: bigint): bigint { a = abs(a); b = abs(b); while (b) [a, b] = [b, a % b]; return a; }
export function q(n: bigint | number, d: bigint | number = 1n): Q {
  let N = BigInt(n), D = BigInt(d);
  if (D === 0n) throw new Error("zero denominator");
  if (D < 0n) { N = -N; D = -D; }
  const g = gcdB(N, D) || 1n;
  return { n: N / g, d: D / g };
}
export const add = (a: Q, b: Q) => q(a.n * b.d + b.n * a.d, a.d * b.d);
export const sub = (a: Q, b: Q) => q(a.n * b.d - b.n * a.d, a.d * b.d);
export const mul = (a: Q, b: Q) => q(a.n * b.n, a.d * b.d);
export const div = (a: Q, b: Q) => q(a.n * b.d, a.d * b.n);
export const eq = (a: Q, b: Q) => a.n === b.n && a.d === b.d;
export const isInt = (a: Q) => a.d === 1n;
/** A decimal or integer literal ("-3", "1.10", "4,587") as an exact rational; null if it is not one. */
export function parseDecimal(s: string): Q | null {
  const t = s.trim().replace(/−/g, "-").replace(/(\d),(?=\d)/g, "$1");
  const m = t.match(/^(-?)(\d+)(?:\.(\d+))?$/);
  if (!m) return null;
  const frac = m[3] ?? "";
  return q(BigInt((m[1] ? "-" : "") + m[2] + frac), 10n ** BigInt(frac.length));
}
/** An answer as written by the app: "5", "-76", "5/6", "1 11/18", "-2 1/2", "4.84". */
export function parseAnswer(s: string): Q | null {
  const t = s.trim().replace(/−/g, "-");
  let m = t.match(/^(-?\d+) (\d+)\/(\d+)$/);
  if (m) { const w = BigInt(m[1]); const f = q(BigInt(m[2]), BigInt(m[3])); return t.startsWith("-") ? sub(q(w), f) : add(q(w), f); }
  m = t.match(/^(-?\d+)\/(\d+)$/);
  if (m) return Number(m[2]) === 0 ? null : q(BigInt(m[1]), BigInt(m[2]));
  return parseDecimal(t);
}
export const fmtFrac = (a: Q) => (a.d === 1n ? `${a.n}` : `${a.n}/${a.d}`);
export function fmtMixed(a: Q): string {
  if (a.d === 1n) return `${a.n}`;
  const neg = a.n < 0n; const N = abs(a.n); const w = N / a.d; const r = N % a.d;
  return `${neg ? "-" : ""}${w ? w + " " : ""}${r}/${a.d}`;
}
