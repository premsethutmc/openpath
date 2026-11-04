/** Exact rationals for the learner's own arithmetic (the learner computes; OpenPath grades). */
export interface Q { n: number; d: number }
const g = (a: number, b: number): number => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
export const q = (n: number, d = 1): Q => { if (d === 0) throw new Error("division by zero"); const s = d < 0 ? -1 : 1, k = g(n, d); return { n: (s * n) / k, d: Math.abs(d) / k }; };
export const add = (a: Q, b: Q) => q(a.n * b.d + b.n * a.d, a.d * b.d);
export const sub = (a: Q, b: Q) => q(a.n * b.d - b.n * a.d, a.d * b.d);
export const mul = (a: Q, b: Q) => q(a.n * b.n, a.d * b.d);
export const div = (a: Q, b: Q) => q(a.n * b.d, a.d * b.n);
export const isZero = (a: Q) => a.n === 0;
export const eq = (a: Q, b: Q) => a.n === b.n && a.d === b.d;
export const show = (a: Q) => (a.d === 1 ? `${a.n}` : `${a.n}/${a.d}`);
