/**
 * Seeded randomness (synthetic-rng@1). mulberry32 over a 32-bit seed; named sub-streams are derived by hashing (FNV-1a) the parent seed with a
 * label, so adding a new kind of random draw never shifts the draws of another stream.
 */
export const RNG_VERSION = "synthetic-rng@1" as const;
export const fnv = (s: string): number => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; };
export class Rng {
  private state: number;
  readonly seed: number;
  draws = 0;
  constructor(seed: number) { this.seed = seed >>> 0; this.state = this.seed || 0x9e3779b9; }
  /** a float in [0, 1) */
  next(): number {
    this.draws++;
    let t = (this.state = (this.state + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  chance(p: number): boolean { return this.next() < Math.max(0, Math.min(1, p)); }
  int(lo: number, hi: number): number { return lo + Math.floor(this.next() * (hi - lo + 1)); }
  pick<T>(xs: readonly T[]): T { return xs[Math.floor(this.next() * xs.length)]; }
  /** an independent named sub-stream */
  stream(label: string): Rng { return new Rng(fnv(`${this.seed}:${label}`)); }
}
