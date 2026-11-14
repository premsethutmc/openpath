/**
 * session-fatigue@1: a session going downhill. Late in one sitting a tired child answers more wrong and more slowly than she
 * did at the start of the same sitting. That is compared with HER OWN start of the sitting, never with other children, and it
 * only ever suggests a short break; it marks nothing and changes no record.
 *
 *   enough work    at least MIN answers in this sitting (first tries only)
 *   downhill       the last LAST answers have at least WRONG wrong, while the earlier ones in the sitting were mostly right
 *                  (at least EARLY_RIGHT of them), or the last LAST took at least SLOWER × as long (median) as the earlier ones
 * A sitting is the answers with no gap of more than GAP minutes between them, ending with the latest answer.
 */
import type { Attempt } from "./records";

export const FATIGUE = { MIN: 8, LAST: 4, WRONG: 3, EARLY_RIGHT: 0.6, SLOWER: 2, GAP: 20 } as const;

export function sitting(attempts: readonly Attempt[]): Attempt[] {
  const xs = attempts.filter((a) => a.n === 1).slice().sort((a, b) => (a.at < b.at ? -1 : 1));
  let k = xs.length - 1;
  while (k > 0 && Date.parse(xs[k].at) - Date.parse(xs[k - 1].at) <= FATIGUE.GAP * 60_000) k--;
  return xs.slice(k);
}

const median = (v: number[]) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };

/** "wrong" or "slow" when this sitting is going downhill, else null */
export function tiring(attempts: readonly Attempt[], right: (a: Attempt) => boolean): "wrong" | "slow" | null {
  const s = sitting(attempts);
  if (s.length < FATIGUE.MIN) return null;
  const last = s.slice(-FATIGUE.LAST), early = s.slice(0, -FATIGUE.LAST);
  const earlyRight = early.filter(right).length / early.length;
  if (last.filter((a) => !right(a)).length >= FATIGUE.WRONG && earlyRight >= FATIGUE.EARLY_RIGHT) return "wrong";
  const t = (xs: Attempt[]) => xs.map((a) => a.ms ?? 0).filter((m) => m > 0);
  const lt = t(last), et = t(early);
  if (lt.length >= 3 && et.length >= 3 && median(lt) >= FATIGUE.SLOWER * median(et)) return "slow";
  return null;
}
