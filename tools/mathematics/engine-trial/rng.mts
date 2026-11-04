/** Seeded, dependency-free PRNG (mulberry32) so every benchmark run is reproducible from its seed. */
export function rng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  /** Integer in [lo, hi], inclusive. */
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  /** Nonzero integer in [lo, hi]. */
  const nz = (lo: number, hi: number) => {
    for (;;) {
      const v = int(lo, hi);
      if (v !== 0) return v;
    }
  };
  /** A bigint with the given number of decimal digits, random sign. */
  const big = (digits: number) => {
    let s = String(int(1, 9));
    for (let i = 1; i < digits; i++) s += String(int(0, 9));
    return (next() < 0.5 ? -1n : 1n) * BigInt(s);
  };
  const pick = <T,>(xs: readonly T[]) => xs[int(0, xs.length - 1)];
  return { next, int, nz, big, pick };
}
