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

/**
 * avdiv [d, q, r, mode]: long division of n = d·q + r by d; mode 0 asks the quotient, 1 the remainder. The type's own
 * steps state the quotient at once and then check it by multiplying, which is not how it is done. This is the method
 * itself: one digit at a time, from the left: how many fit, what is left over, bring the next digit down.
 */
function longDivision({ params: [d, q, r, mode], answer }: Q): Worked[] | null {
  const n = d * q + r;
  if (!Number.isInteger(n) || d < 2 || d > 12 || n < 10 || n > 99999 || r < 0 || r >= d) return null;
  if (String(mode === 1 ? r : q) !== answer) return null;
  const digits = String(n).split("").map(Number), PLACE = ["ones", "tens", "hundreds", "thousands", "ten thousands"];
  const out: Worked[] = [];
  let carry = 0, quotient = "";
  digits.forEach((digit, i) => {
    const place = PLACE[digits.length - 1 - i], cur = carry * 10 + digit, fit = Math.floor(cur / d), left = cur - fit * d, last = i === digits.length - 1;
    const where = i === 0 ? `First: start at the left, with the ${place}. ` : "";
    if (fit === 0) {
      out.push({ next: `${where}How many ${d}s fit in ${cur}?`, shown: `None: ${d} is more than ${cur}. Write 0 above the ${place}${last ? "" : ` and keep the ${cur}`}.` });
    } else {
      out.push({ next: `${where}How many ${d}s fit in ${cur}, without going over?`, shown: `${fit}, because ${d} × ${fit} = ${d * fit}${(fit + 1) * d <= 99 ? ` and ${d} × ${fit + 1} = ${d * (fit + 1)} is too many` : ""}. Write ${fit} above the ${place}.` });
      out.push({ next: `What is left over from the ${cur}?`, shown: `${cur} − ${d * fit} = ${left}` });
    }
    quotient += String(fit);
    carry = left;
    if (!last) out.push({ next: `Bring down the next digit, ${digits[i + 1]}, beside the ${left}.`, shown: `${left === 0 ? `Nothing was left over, so it is just ${digits[i + 1]}` : `${left} and ${digits[i + 1]} side by side make ${left * 10 + digits[i + 1]}`}.` });
  });
  if (Number(quotient) !== q || carry !== r) return null;
  out.push({ next: "Last: read the answer off the top.", shown: mode === 1 ? `The digits on top make ${q}, and what is left at the end is the remainder: ${r}.` : `The digits on top make the quotient: ${q}.${r ? ` (${r} is left over.)` : ""}` });
  return out;
}

const HANDLERS: Record<string, (q: Q) => Worked[] | null> = { agptest: primeTest, avdiv: longDivision };
export const WORKED_OUT: readonly string[] = Object.keys(HANDLERS);
/** The full working for a question of a type that has one, or null. */
export function workedOut(q: Q): Worked[] | null {
  if (!Object.prototype.hasOwnProperty.call(HANDLERS, q.family)) return null;
  try { const w = HANDLERS[q.family](q); return w && w.length >= 2 ? w : null; } catch { return null; }
}
