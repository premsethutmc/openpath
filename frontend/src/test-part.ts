/**
 * test-part@1: a few long tests walk a large collection (every family, every board release, every competency of a grade).
 * CI runs those collections in parts across parallel jobs: TEST_PART="k/N" (1-based) keeps every N-th item starting at the
 * k-th. Unset (locally, or any run without sharding) a test sees the whole collection, so nothing is skipped by default.
 * tools/test-shards.mjs --verify checks that the parts of every split file add up to the whole.
 */
const parse = (raw: string | undefined): { k: number; n: number } | null => {
  const m = raw ? /^(\d+)\/(\d+)$/.exec(raw.trim()) : null;
  if (!m) return null;
  const k = Number(m[1]), n = Number(m[2]);
  if (!(n >= 1 && k >= 1 && k <= n)) throw new Error(`TEST_PART=${raw}: expected k/N with 1 ≤ k ≤ N`);
  return { k, n };
};
export const testPart = parse(process.env.TEST_PART);
/** This run's part of a collection (all of it when TEST_PART is unset). */
export function inPart<T>(xs: readonly T[]): T[] {
  if (!testPart || testPart.n === 1) return [...xs];
  return xs.filter((_, i) => i % testPart.n === testPart.k - 1);
}
/** A label for a split test's messages, e.g. " (part 2/6)". */
export const partLabel = testPart && testPart.n > 1 ? ` (part ${testPart.k}/${testPart.n})` : "";
