/**
 * worked-out@1: for a type whose own steps are a summary ("Try the primes up to 23: 19 divides it"), the whole working a
 * learner would actually do, one small step at a time, written once for the type from its own numbers. It replaces the
 * type's steps in the step help, and is kept only when its last line arrives at the question's verified answer.
 *
 * One handler per type (data and plain arithmetic; nothing is generated when the learner asks). Add a type here when its
 * steps leap over the work.
 */
export interface Worked { next: string; shown: string }
type Q = { family: string; params: number[]; answer: string };

const primesTo = (k: number) => { const out: number[] = []; for (let n = 2; n <= k; n++) if (out.every((p) => n % p)) out.push(n); return out; };

/** agptest [mode, n]: mode 0 the largest prime that must be tried to test n; mode 1 the smallest prime factor of n. */
function primeTest({ params: [mode, n], answer }: Q): Worked[] | null {
  if (!Number.isInteger(n) || n < 10 || n > 100000) return null;
  let k = 1; while ((k + 1) * (k + 1) <= n) k++;
  const tries = primesTo(k), out: Worked[] = [];
  out.push({ next: `First: how far do you need to try? Find the biggest whole number whose square is not more than ${n}.`, shown: `It is ${k}: ${k} × ${k} = ${k * k}` });
  out.push({ next: `Check the next one up, to be sure.`, shown: `${k + 1} × ${k + 1} = ${(k + 1) * (k + 1)}, which is more than ${n}. So only the primes up to ${k} need trying: ${tries.join(", ")}.` });
  if (mode === 0) {
    const last = tries[tries.length - 1];
    if (String(last) !== answer) return null;
    out.push({ next: "Last: which of those is the largest?", shown: `The largest prime that must be tried is ${last}. If a bigger number divided ${n}, its partner would be smaller than ${k + 1}, and would have been found already.` });
    return out;
  }
  let carry = "", found = 0;
  for (const p of tries) {
    const q = Math.floor(n / p), r = n - p * q, cue = (t: string) => `${carry}${t}`;
    if (p === 2) { out.push({ next: cue("Try 2: is the number even?"), shown: r ? `${n} ends in ${n % 10}, an odd digit, so 2 does not divide it.` : `${n} ends in ${n % 10}, an even digit, so 2 divides it.` }); carry = ""; }
    else if (p === 3) { const d = String(n).split(""), sum = d.reduce((a, b) => a + Number(b), 0); out.push({ next: cue("Try 3: add the digits."), shown: `${d.join(" + ")} = ${sum}` }); carry = sum % 3 ? `${sum} is not in the 3 times table, so 3 does not divide ${n}. ` : ""; if (!r) out.push({ next: `Is that sum in the 3 times table?`, shown: `Yes, so 3 divides ${n}.` }); }
    else if (p === 5) { out.push({ next: cue("Try 5: look at the last digit."), shown: r ? `The last digit is ${n % 10}, not 0 or 5, so 5 does not divide ${n}.` : `The last digit is ${n % 10}, so 5 divides ${n}.` }); carry = ""; }
    else if (r) { out.push({ next: cue(`Try ${p}: how many ${p}s fit, and what is left over?`), shown: `${p} × ${q} = ${p * q}. Left over: ${n} − ${p * q} = ${r}` }); carry = `Something is left over, so ${p} does not divide ${n}. `; }
    else { out.push({ next: cue(`Try ${p}: does it go in exactly?`), shown: `${n} ÷ ${p} = ${q}` }); carry = ""; }
    if (!r) { found = p; break; }
  }
  const ans = found || n;
  if (String(ans) !== answer) return null;
  out.push(found
    ? { next: "Last: say what you found.", shown: `${found} divides ${n} exactly, and nothing smaller did. The smallest prime factor is ${found}.` }
    : { next: `${carry}Last: say what you found.`, shown: `No prime up to ${k} divides ${n}, so ${n} is a prime number. Its smallest prime factor is itself: ${n}.` });
  return out;
}

const HANDLERS: Record<string, (q: Q) => Worked[] | null> = { agptest: primeTest };
export const WORKED_OUT: readonly string[] = Object.keys(HANDLERS);
/** The full working for a question of a type that has one, or null. */
export function workedOut(q: Q): Worked[] | null {
  if (!Object.prototype.hasOwnProperty.call(HANDLERS, q.family)) return null;
  try { const w = HANDLERS[q.family](q); return w && w.length >= 2 ? w : null; } catch { return null; }
}
