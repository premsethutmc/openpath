/**
 * worked-out@1: for a type whose own steps are a summary ("Try the primes up to 23: 19 divides it"), the whole working a
 * learner would actually do, one small step at a time, written once for the type from its own numbers. It replaces the
 * type's steps in the step help, and is kept only when its last line arrives at the question's verified answer.
 *
 * One handler per type (data and plain arithmetic; nothing is generated when the learner asks). Add a type here when its
 * steps leap over the work.
 */
export interface Worked {
  next: string; shown: string;
  /** another skill this step leans on (its card is offered), where there is one */
  needs?: string;
  /** board@1: the written layout as it stands once this step is done (long division's bracket), one text line per row */
  board?: string[];
}
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
 * Long division as it is written in school: the bracket, one digit at a time from the left. How many fit, write the
 * product underneath, take it away, bring the next digit down. When the divisor is more than the first digit, the first
 * two digits are taken together. Each step carries the layout as it then stands.
 *
 * avdiv [d, q, r, mode]: n = d·q + r; mode 0 asks the quotient, 1 the remainder. ldiv [q, d]: n = d·q exactly.
 */
function divide(n: number, d: number, want: "quotient" | "remainder", answer: string): Worked[] | null {
  const q = Math.floor(n / d), r = n - q * d;
  if (!Number.isInteger(n) || d < 2 || d > 99 || n < 10 || n > 999999) return null;
  if (String(want === "remainder" ? r : q) !== answer) return null;
  const digits = String(n).split("").map(Number), PLACE = ["ones", "tens", "hundreds", "thousands", "ten thousands", "lakhs"];
  const pad = String(d).length + 3, at = (text: string, endCol: number) => " ".repeat(Math.max(0, pad + endCol + 1 - text.length)) + text;
  const top: string[] = digits.map(() => " "), under: string[] = [];
  const board = () => [" ".repeat(pad) + top.join("").replace(/\s+$/, ""), `${d} ) ${n}`, ...under];
  const out: Worked[] = [];
  let carry = 0, started = false, opening = "";
  digits.forEach((digit, i) => {
    const place = PLACE[digits.length - 1 - i], cur = carry * 10 + digit, fit = Math.floor(cur / d), left = cur - fit * d, last = i === digits.length - 1;
    if (!started && fit === 0 && !last) {
      // the divisor is more than what there is so far: take the next digit with it (nothing is written yet)
      opening = `${d} is more than ${cur}, so take the next digit with it. `;
      carry = cur;
      return;
    }
    const first = !started ? `First: ${opening}` : "";
    started = true;
    if (fit === 0) {
      top[i] = "0";
      out.push({ next: `How many ${d}s fit in ${cur}?`, shown: `None: ${d} is more than ${cur}. Write 0 on top${last ? "" : `, and keep the ${cur}`}.`, board: board() });
    } else {
      top[i] = String(fit);
      under.push(at(String(d * fit), i));
      out.push({ next: `${first}How many ${d}s fit in ${cur}, without going over?`, shown: `${fit}, because ${d} × ${fit} = ${d * fit}${(fit + 1) * d <= 999 ? ` and ${d} × ${fit + 1} = ${d * (fit + 1)} is too many` : ""}. Write ${fit} on top and ${d * fit} under the ${cur}.`, needs: "MATH.number.multiplication-tables", board: board() });
      under.push(at("-".repeat(String(cur).length), i), at(String(left), i));
      out.push({ next: `Take it away. What is left from the ${cur}?`, shown: `${cur} − ${d * fit} = ${left}`, board: board() });
    }
    carry = left;
    if (!last) {
      if (fit !== 0) under[under.length - 1] = at(`${left === 0 ? "" : left}${digits[i + 1]}`, i + 1); else under.push(at(`${left === 0 ? "" : left}${digits[i + 1]}`, i + 1));
      out.push({ next: `Bring down the next digit, ${digits[i + 1]}.`, shown: left === 0 ? `Nothing was left, so there is just ${digits[i + 1]} to share.` : `${left} with ${digits[i + 1]} beside it makes ${left * 10 + digits[i + 1]}.`, board: board() });
    }
    void place;
  });
  if (!started || carry !== r) return null;
  out.push({ next: "Last: read the answer off the top.", shown: want === "remainder" ? `The top line says ${q}, and what is left at the bottom is the remainder: ${r}.` : `The top line is the answer: ${q}.${r ? ` (${r} is left over.)` : ""}`, board: board() });
  return out;
}
const longDivision = ({ params: [d, q, r, mode], answer }: Q): Worked[] | null => (r >= 0 && r < d ? divide(d * q + r, d, mode === 1 ? "remainder" : "quotient", answer) : null);
const exactDivision = ({ params: [q, d], answer }: Q): Worked[] | null => divide(q * d, d, "quotient", answer);

const HANDLERS: Record<string, (q: Q) => Worked[] | null> = { agptest: primeTest, avdiv: longDivision, ldiv: exactDivision };
export const WORKED_OUT: readonly string[] = Object.keys(HANDLERS);
/** The full working for a question of a type that has one, or null. */
export function workedOut(q: Q): Worked[] | null {
  if (!Object.prototype.hasOwnProperty.call(HANDLERS, q.family)) return null;
  try { const w = HANDLERS[q.family](q); return w && w.length >= 2 ? w : null; } catch { return null; }
}
