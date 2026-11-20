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
  /**
   * type-it@1: what the learner enters for this step where its result is a number but the step as shown is a sentence
   * ("How many 6s fit in 34?" → 5): the words before the box, and the number that is right.
   */
  ask?: { lead: string; value: string };
}
type Q = { family: string; params: number[]; answer: string; prompt?: string; options?: string[]; steps?: { inputs?: unknown[] }[] };

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
export function divide(n: number, d: number, want: "quotient" | "remainder", answer: string): Worked[] | null {
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
    const first = !started ? `First: ${opening.charAt(0).toLowerCase()}${opening.slice(1)}` : "";
    started = true;
    if (fit === 0) {
      top[i] = "0";
      out.push({ next: `How many ${d}s fit in ${cur}?`, shown: `None: ${d} is more than ${cur}. Write 0 on top${last ? "" : `, and keep the ${cur}`}.`, board: board(), ask: { lead: `Number of ${d}s in ${cur}:`, value: "0" } });
    } else {
      top[i] = String(fit);
      under.push(at(String(d * fit), i));
      out.push({ next: `${first}How many ${d}s fit in ${cur}, without going over?`, shown: `${fit}, because ${d} × ${fit} = ${d * fit}${(fit + 1) * d <= 999 ? ` and ${d} × ${fit + 1} = ${d * (fit + 1)} is too many` : ""}. Write ${fit} on top and ${d * fit} under the ${cur}.`, needs: "MATH.number.multiplication-tables", ask: { lead: `Number of ${d}s in ${cur}:`, value: String(fit) }, board: board() });
      under.push(at("-".repeat(String(cur).length), i), at(String(left), i));
      out.push({ next: `Take it away. What is left from the ${cur}?`, shown: `${cur} − ${d * fit} = ${left}`, board: board() });
    }
    carry = left;
    if (!last) {
      if (fit !== 0) under[under.length - 1] = at(`${left === 0 ? "" : left}${digits[i + 1]}`, i + 1); else under.push(at(`${left === 0 ? "" : left}${digits[i + 1]}`, i + 1));
      out.push({ next: `Bring down the next digit, ${digits[i + 1]}.`, shown: left === 0 ? `Nothing was left, so there is just ${digits[i + 1]} to share.` : `${left} with ${digits[i + 1]} beside it makes ${left * 10 + digits[i + 1]}.`, board: board(), ask: { lead: "The number to share now:", value: String(left * 10 + digits[i + 1]) } });
    }
    void place;
  });
  if (!started || carry !== r) return null;
  out.push({ next: "Last: read the answer off the top.", shown: want === "remainder" ? `The top line says ${q}, and what is left at the bottom is the remainder: ${r}.` : `The top line is the answer: ${q}.${r ? ` (${r} is left over.)` : ""}`, board: board() });
  return out;
}
/**
 * side-answer@1: a long division's steps with the answer written to the right of the number ("6 ) 348 ( 58") in place
 * of on top. The same steps and the same numbers; only where the answer's digits are written, and the words for it.
 */
function atTheSide(steps: Worked[]): Worked[] {
  const words = (t: string) => t.replace(/on top/g, "at the side").replace(/off the top/g, "off the side").replace(/The top line (is the answer|says)/g, (_, w: string) => (w === "says" ? "The number at the side is" : "The number at the side is the answer"));
  return steps.map((s) => ({ ...s, next: words(s.next), shown: words(s.shown), ...(s.board ? { board: [`${s.board[1]}${s.board[0].trim() ? ` ( ${s.board[0].trim()}` : ""}`, ...s.board.slice(2)] } : {}) }));
}
const longDivision = ({ params: [d, q, r, mode], answer }: Q): Worked[] | null => (r >= 0 && r < d ? divide(d * q + r, d, mode === 1 ? "remainder" : "quotient", answer) : null);
const exactDivision = ({ params: [q, d], answer }: Q): Worked[] | null => divide(q * d, d, "quotient", answer);

/**
 * Column addition and subtraction as written in school: the numbers one under the other, ones first, carrying a ten up or
 * borrowing one from the next column. For any question that is two whole numbers added or subtracted ("104 + 737 = ?"),
 * whatever its type: it is read from the question's own words and kept only when it ends on the verified answer.
 */
const PLACES = ["ones", "tens", "hundreds", "thousands", "ten thousands", "lakhs", "ten lakhs", "crores"];
function columns(prompt: string | undefined, answer: string, dp = 0): Worked[] | null {
  const PLACES_HERE = dp ? [...["thousandths", "hundredths", "tenths"].slice(3 - dp), ...PLACES] : PLACES;
  const m = prompt ? /^([\d,]+) ([+−-]) ([\d,]+) = \?$/.exec(prompt.trim()) : null;
  if (!m) return null;
  const a = Number(m[1].replace(/,/g, "")), b = Number(m[3].replace(/,/g, "")), plus = m[2] === "+";
  if (!Number.isInteger(a) || !Number.isInteger(b) || Math.max(a, b) < 10 || a > 99999999 || b > 99999999 || (!plus && a < b)) return null;
  const result = plus ? a + b : a - b;
  if (String(result) !== answer.replace(/,/g, "")) return null;
  const width = Math.max(String(a).length, String(b).length, String(result).length) + 2;
  const row = (t: string) => t.padStart(width, " ");
  // borrow@1: a subtraction is set out with room above each digit for what it becomes after borrowing (860 → 8 5 10),
  // the way a child writes the small numbers above the crossed-out ones
  const cells = String(a).length, wide = (xs: (string | number)[], sign = " ") => `${sign} ${xs.map((x) => String(x).padStart(2, " ")).join(" ")}`;
  const now: (number | "")[] = Array(cells).fill("");
  const da = String(a).split("").reverse().map(Number), db = String(b).split("").reverse().map(Number), n = Math.max(da.length, db.length);
  const carries: string[] = Array(width).fill(" "), done: string[] = [];
  const spread = (v: string) => v.padStart(cells, " ").split("");
  const board = () => (plus
    ? [...(carries.some((c) => c !== " ") ? [carries.join("").replace(/\s+$/, "")] : []), row(String(a)), `+${row(String(b)).slice(1)}`, "-".repeat(width), row(done.join(""))]
    : [...(now.some((v) => v !== "") ? [wide(now).replace(/\s+$/, "")] : []), wide(spread(String(a))), wide(spread(String(b)), "−"), "-".repeat(2 + cells * 3 - 1), wide(spread(done.join("")))]);
  const out: Worked[] = [];
  let carry = 0;
  for (let i = 0; i < n; i++) {
    const x = da[i] ?? 0, y = db[i] ?? 0, place = PLACES_HERE[i], next = PLACES_HERE[i + 1], lead = i === 0 ? `First: start on the right, with the ${PLACES_HERE[0]}. ` : "";
    if (plus) {
      const sum = x + y + carry, last = i === n - 1;
      out.push({ next: `${lead}Add the ${place}${carry ? ", and the 1 that was carried" : ""}.`, shown: `${x} + ${y}${carry ? " + 1" : ""} = ${sum}` });
      if (sum >= 10 && !last) carries[width - 2 - i] = "1";
      done.unshift(last ? String(sum) : String(sum % 10));
      if (sum >= 10) out.push({ next: `${sum} is more than 9. What is written, and what is carried?`, shown: last ? `There is no column left, so write ${sum}.` : `Write ${sum % 10} under the ${place} and carry 1 to the ${next}.`, board: board() });
      else out[out.length - 1].board = board();
      carry = sum >= 10 ? 1 : 0;
    } else {
      const have = x - carry;
      if (have < y) {
        out.push({ next: `${lead}The ${place}: can ${y} be taken from ${Math.max(have, 0)}?`, shown: carry ? (x === 0 ? `No. This column has already lent 1, so borrow 1 from the ${next}: 10, less the 1 it lent, is 9.` : `No. It lent 1, so it has ${have}. Borrow 1 from the ${next}: ${have + 10}.`) : `No: ${x} is less than ${y}. Borrow 1 from the ${next}, which makes ${x + 10}.` });
        out.push({ next: `Now take away in the ${place}.`, shown: `${have + 10} − ${y} = ${have + 10 - y}` });
        done.unshift(String(have + 10 - y));
        now[cells - 1 - i] = have + 10;
        if (cells - 2 - i >= 0) now[cells - 2 - i] = (da[i + 1] ?? 0) - 1 < 0 ? "" : (da[i + 1] ?? 0) - 1;
        carry = 1;
      } else {
        out.push({ next: `${lead}Take away in the ${place}${carry ? " (it lent 1)" : ""}.`, shown: `${have} − ${y} = ${have - y}` });
        done.unshift(String(have - y));
        carry = 0;
      }
      out[out.length - 1].board = board();
    }
  }
  if (Number(done.join("")) !== result) return null;
  out.push({ next: "Last: read the answer off the bottom line.", shown: `The bottom line is the answer: ${result}.`, board: [...board().slice(0, -1), plus ? row(String(result)) : wide(spread(String(result)))] });
  return out;
}

/**
 * Column multiplication the way it is written at school: by one digit, right to left, carrying; a multiplier like 90 or
 * 900 has its zeros written first. Read from the question's own words and offered only when it ends on the answer.
 */
function multiply(prompt: string | undefined, answer: string): Worked[] | null {
  const m = prompt ? /^([\d,]+) × ([\d,]+) = \?$/.exec(prompt.trim()) : null;
  if (!m) return null;
  const a = Number(m[1].replace(/,/g, "")), b = Number(m[2].replace(/,/g, ""));
  const zeros = /0*$/.exec(String(b))![0].length, d = b / 10 ** zeros, result = a * b;
  if (a < 13 || a > 999999 || d < 2 || d > 9 || zeros > 3 || String(result) !== answer.replace(/,/g, "")) return null;
  const width = Math.max(String(result).length, String(b).length) + 2, row = (t: string) => t.padStart(width, " ");
  const da = String(a).split("").reverse().map(Number), n = da.length;
  const carries: string[] = Array(width).fill(" "), done: string[] = Array(zeros).fill("0");
  const board = () => [...(carries.some((c) => c !== " ") ? [carries.join("").replace(/\s+$/, "")] : []), row(String(a)), `×${row(String(b)).slice(1)}`, "-".repeat(width), row(done.join(""))];
  const out: Worked[] = [];
  if (zeros) out.push({ next: `First: ${b} is ${d} ${["", "tens", "hundreds", "thousands"][zeros]}. What is written before multiplying by ${d}?`, shown: `Write ${zeros === 1 ? "0 in the ones place" : `${zeros} zeros on the right`}. Then multiply by ${d}.`, board: board() });
  let carry = 0;
  for (let i = 0; i < n; i++) {
    const x = da[i], prod = x * d + carry, last = i === n - 1, place = PLACES[i];
    const lead = i === 0 && !zeros ? "First: start on the right, with the ones. " : "";
    const sum = carry ? `${x} × ${d} = ${x * d}, and ${x * d} + ${carry} = ${prod}` : `${x} × ${d} = ${prod}`;
    out.push({ next: `${lead}Multiply the ${place} of ${a} by ${d}${carry ? `, then add the ${carry} that was carried` : ""}.`, shown: last && prod >= 10 ? `${sum}. No column is left, so write ${prod}.` : sum });
    if (prod >= 10 && !last) {
      carries[width - 2 - i] = String(Math.floor(prod / 10));
      done.unshift(String(prod % 10));
      out.push({ next: `${prod} is more than 9. What is written, and what is carried?`, shown: `Write ${prod % 10} and carry ${Math.floor(prod / 10)} to the ${PLACES[i + 1]} of ${a}.`, board: board() });
      carry = Math.floor(prod / 10);
    } else { done.unshift(String(prod)); out[out.length - 1].board = board(); carry = 0; }
  }
  if (Number(done.join("")) !== result) return null;
  out.push({ next: "Last: read the answer off the bottom line.", shown: `The bottom line is the answer: ${result}.`, board: board() });
  return out;
}

/**
 * avpp [a, b, k]: a × b with a two-digit b, written as long multiplication: one row for the ones of b, one row for its
 * tens (a 0 first), then the rows are added. k 1 asks only for the tens row.
 */
function longMultiply({ params: [a, b, k], answer }: Q): Worked[] | null {
  const o = b % 10, T = b - o, t = T / 10, result = a * b;
  if (k === 1 && t === 1) {
    // a × 10: the 0 is written, and the number moves one place to the left
    if (String(a * 10) !== answer.replace(/,/g, "")) return null;
    const w = String(a * 10).length + 2, r = (x: string) => x.padStart(w, " "), top = [r(String(a)), `×${r("10").slice(1)}`, "-".repeat(w)];
    return [
      { next: `First: 10 is 1 ten. What is written before multiplying by 1?`, shown: "Write 0 in the ones place.", board: [...top, r("0")] },
      { next: `Now multiply ${a} by 1 and write it to the left of the 0.`, shown: `${a} × 1 = ${a}, written one place to the left.`, board: [...top, r(String(a * 10))] },
      { next: "Last: read the answer off the bottom line.", shown: `The bottom line is the answer: ${a * 10}.`, board: [...top, r(String(a * 10))] },
    ];
  }
  if (k === 1) return multiply(`${a} × ${T} = ?`, answer);
  if (k !== 0 || o < 1 || t < 1 || t > 9 || a < 10 || a > 9999 || String(result) !== answer.replace(/,/g, "")) return null;
  const width = String(result).length + 2, row = (x: string) => x.padStart(width, " ");
  const rows: string[] = [], da = String(a).split("").reverse().map(Number);
  const board = (total = false) => [row(String(a)), `×${row(String(b)).slice(1)}`, "-".repeat(width), ...rows, ...(total ? ["-".repeat(width), row(String(result))] : [])];
  const out: Worked[] = [];
  const pass = (d: number, zero: boolean, at: number) => {
    const done: string[] = zero ? ["0"] : [];
    if (zero) { rows[at] = row("0"); out.push({ next: `Second row: ${a} × ${T}. The ${t} in ${b} stands for ${T}. What is written first?`, shown: `Write 0 in the ones place. Then multiply ${a} by ${t}.`, board: board() }); }
    let carry = 0;
    da.forEach((x, i) => {
      const prod = x * d + carry, last = i === da.length - 1, c = Math.floor(prod / 10);
      const lead = i === 0 && !zero ? `First row: ${a} × ${d}, the ones of ${b}. Start on the right. ` : "";
      const sum = carry ? `${x} × ${d} = ${x * d}, and ${x * d} + ${carry} = ${prod}` : `${x} × ${d} = ${prod}`;
      done.unshift(last ? String(prod) : String(prod % 10));
      rows[at] = row(done.join(""));
      out.push({ next: `${lead}Multiply the ${PLACES[i]} of ${a} by ${d}${carry ? `, then add the ${carry} carried` : ""}.`, shown: prod >= 10 && !last ? `${sum}. Write ${prod % 10}, carry ${c}.` : `${sum}. Write ${prod}.`, board: board() });
      carry = last ? 0 : c;
    });
    return Number(done.join(""));
  };
  if (pass(o, false, 0) !== a * o || pass(t, true, 1) !== a * T) return null;
  out.push({ next: "Last: add the two rows.", shown: `${a * o} + ${a * T} = ${result}`, board: board(true) });
  return out;
}

/**
 * Adding and subtracting fractions with different bottoms, the way it is written at school: mixed numbers become
 * improper fractions, both are renamed over the LCM of the bottoms, the tops are added, and the result is made simple.
 * Read from the question's own words; offered only when it ends on the verified answer.
 */
function unlikeFractions(prompt: string | undefined, answer: string): Worked[] | null {
  const m = prompt ? /^(?:(\d+) )?(\d+)\/(\d+) ([+−]) (?:(\d+) )?(\d+)\/(\d+) = \?/.exec(prompt.trim()) : null;
  if (!m) return null;
  const [w1, n1, d1, w2, n2, d2] = [m[1], m[2], m[3], m[5], m[6], m[7]].map((x) => Number(x ?? 0)), plus = m[4] === "+";
  if (!d1 || !d2 || d1 > 99 || d2 > 99 || (d1 === d2 && !w1 && !w2)) return null;
  const a = w1 * d1 + n1, b = w2 * d2 + n2, L = (d1 * d2) / gcd2(d1, d2), A = a * (L / d1), B = b * (L / d2), R = plus ? A + B : A - B;
  if (R <= 0) return null;
  const g = gcd2(R, L), n = R / g, d = L / g, whole = Math.floor(n / d), rest = n - whole * d;
  const want = answer.replace(/\s+/g, " ").trim();
  const form = d === 1 ? String(n) : want === `${n}/${d}` ? `${n}/${d}` : `${whole} ${rest}/${d}`;
  if (form !== want) return null;
  const lines = [`${m[1] ? `${w1} ` : ""}${n1}/${d1} ${m[4]} ${m[5] ? `${w2} ` : ""}${n2}/${d2}`];
  const out: Worked[] = [], put = (next: string, shown: string, line?: string) => { if (line) lines.push(`= ${line}`); out.push({ next: out.length ? next : `First: ${next.charAt(0).toLowerCase()}${next.slice(1)}`, shown, board: [...lines] }); };
  if (w1 || w2) {
    const parts = [[w1, n1, d1, a], [w2, n2, d2, b]].filter(([w]) => w).map(([w, nn, dd, t]) => `${w} ${nn}/${dd} = (${w} × ${dd} + ${nn})/${dd} = ${t}/${dd}`);
    put(`${w1 && w2 ? "Write the mixed numbers as improper fractions" : "Write the mixed number as an improper fraction"}: whole × bottom + top.`, parts.join("; "), `${a}/${d1} ${m[4]} ${b}/${d2}`);
  }
  if (d1 !== d2) {
    put(`The bottoms are ${d1} and ${d2}. What is the smallest number both go into?`, L === d1 * d2 ? `${d1} × ${d2} = ${L}, and nothing smaller works: the LCM is ${L}.` : `The LCM of ${d1} and ${d2} is ${L} (${L} = ${d1} × ${L / d1} = ${d2} × ${L / d2}).`);
    out[out.length - 1].ask = { lead: `Smallest number ${d1} and ${d2} both go into:`, value: String(L) };
    const ren = ([t, dd, T]: number[]) => (dd === L ? null : `${L} ÷ ${dd} = ${L / dd}, so multiply top and bottom by ${L / dd}: ${t}/${dd} = ${T}/${L}`);
    const r1 = ren([a, d1, A]), r2 = ren([b, d2, B]);
    if (r1) put(`Rename ${a}/${d1} with ${L} at the bottom.`, r1, r2 ? undefined : `${A}/${L} ${m[4]} ${B}/${L}`);
    if (r2) put(`Rename ${b}/${d2} with ${L} at the bottom.`, r2, `${A}/${L} ${m[4]} ${B}/${L}`);
  }
  put(`The pieces are now the same size. ${plus ? "Add" : "Subtract"} the tops and keep ${L} at the bottom.`, `${A} ${m[4]} ${B} = ${R}, so ${R}/${L}`, `${R}/${L}`);
  if (g > 1) put(`Can ${R}/${L} be made simpler?`, d === 1 ? `Divide top and bottom by ${g}: ${n}` : `Divide top and bottom by ${g}: ${n}/${d}`, d === 1 ? String(n) : `${n}/${d}`);
  if (d > 1 && form !== `${n}/${d}`) put("The top is bigger than the bottom. Write it as a mixed number.", `${n} ÷ ${d} = ${whole} remainder ${rest}: ${form}`, form);
  if (out.length < 2) return null;
  const last = out[out.length - 1];
  last.next = `Last: ${last.next.charAt(0).toLowerCase()}${last.next.slice(1)}`;
  return out;
}

/**
 * Adding and subtracting decimals as written at school: the points are lined up, gaps are filled with zeros, and the
 * columns are worked from the right exactly as for whole numbers, with the point kept in its column.
 */
function decimals(prompt: string | undefined, answer: string): Worked[] | null {
  const m = prompt ? /^Work out (\d+(?:\.\d+)?) ([+−]) (\d+(?:\.\d+)?)\.$/.exec(prompt.trim()) : null;
  if (!m) return null;
  const places = (t: string) => (t.split(".")[1] ?? "").length, dp = Math.max(places(m[1]), places(m[3])), plus = m[2] === "+";
  if (!dp || dp > 3) return null;
  const A = Math.round(Number(m[1]) * 10 ** dp), B = Math.round(Number(m[3]) * 10 ** dp), R = plus ? A + B : A - B;
  if (R < 0 || A < 10 ** dp || Math.abs(R / 10 ** dp - Number(answer)) > 1e-9) return null;
  const inner = columns(`${A} ${m[2]} ${B} = ?`, String(R), dp);
  if (!inner) return null;
  const set = (r: string, i: number, c: string) => r.slice(0, i) + c + r.slice(i + 1);
  // the point goes in its own column; a number row is filled with zeros up to the ones, a row still being written is not
  const pointed = (rows: string[], final: boolean) => {
    const dash = rows.findIndex((r) => /^-+$/.test(r)), L = rows[dash].length;
    return rows.map((r, k) => {
      if (k === dash) return plus ? `${r}-` : r;
      const whole = k === dash - 2 || k === dash - 1 || (k > dash && final);
      if (plus) {
        const i = L - dp;
        if (k < dash - 2) return r.length > i ? `${r.slice(0, i)} ${r.slice(i)}` : r;
        let t = r;
        if (whole) for (let j = i - 1; j < L; j++) if (t[j] === " ") t = set(t, j, "0");
        return `${t.slice(0, i)}${t[i] === " " ? " " : "."}${t.slice(i)}`;
      }
      const i = L - 3 * dp;
      if (k < dash - 2) return r;
      let t = r.padEnd(L, " ");
      if (whole) for (let j = i - 1; j < L; j += 3) if (t[j] === " ") t = set(t, j, "0");
      return t[i + 2] === " " ? t : set(t, i, ".");
    });
  };
  const pad = (t: string) => (places(t) < dp ? `${t} = ${t.includes(".") ? t : `${t}.`}${"0".repeat(dp - places(t))}` : null);
  const fills = [pad(m[1]), pad(m[3])].filter(Boolean);
  const out: Worked[] = [{ next: "First: line up the decimal points. Do both numbers have the same number of decimal places?", shown: fills.length ? `Fill the gap with ${dp - Math.min(places(m[1]), places(m[3])) === 1 ? "a zero" : "zeros"}: ${fills.join(" and ")}.` : `Yes: both have ${dp}. The points sit one under the other.` }];
  inner.forEach((st, k) => {
    const last = k === inner.length - 1;
    out.push({ ...st, next: k === 0 ? st.next.replace(/^First: s/, "S") : st.next, shown: last ? `Put the point in its column. The answer is ${answer}.` : st.shown, board: st.board ? pointed(st.board, last) : undefined });
  });
  return out;
}

/** Improper fraction ↔ mixed number, and a percentage of an amount: each in the way it is written at school. */
function fractionForms(prompt: string | undefined, answer: string): { name: string; steps: Worked[] } | null {
  const text = prompt?.trim() ?? "", want = answer.replace(/\s+/g, " ").trim();
  let m = /^Write (\d+)\/(\d+) as a mixed number/.exec(text);
  if (m) {
    const n = Number(m[1]), d = Number(m[2]), w = Math.floor(n / d), r = n - w * d, g = gcd2(r, d);
    if (d < 2 || w < 1 || r < 1) return null;
    const plain = `${w} ${r}/${d}`, simple = `${w} ${r / g}/${d / g}`;
    if (want !== simple) return null;
    const steps: Worked[] = [
      { next: `First: ${d} pieces make one whole. How many ${d}s fit in ${n}?`, shown: `${d} × ${w} = ${w * d}, and ${d} × ${w + 1} = ${(w + 1) * d} is too many: ${w} whole ones.`, board: [`${n} ÷ ${d} = ${w} remainder ?`], ask: { lead: `Number of ${d}s in ${n}:`, value: String(w) } },
      { next: "How many pieces are left over?", shown: `${n} − ${w * d} = ${r}`, board: [`${n} ÷ ${d} = ${w} remainder ${r}`] },
      { next: `${g > 1 ? "Write" : "Last: write"} the whole ones, then the left-over pieces over the same bottom.`, shown: `${n}/${d} = ${plain}`, board: [`${n} ÷ ${d} = ${w} remainder ${r}`, `${n}/${d} = ${plain}`] },
    ];
    if (g > 1) steps.push({ next: `Last: can ${r}/${d} be made simpler?`, shown: `Divide top and bottom by ${g}: ${simple}`, board: [`${n} ÷ ${d} = ${w} remainder ${r}`, `${n}/${d} = ${plain}`, `= ${simple}`] });
    return { name: "Divide", steps };
  }
  m = /^Write the mixed number (\d+) (\d+)\/(\d+) as an improper fraction/.exec(text);
  if (m) {
    const w = Number(m[1]), n = Number(m[2]), d = Number(m[3]), top = w * d + n;
    if (want !== `${top}/${d}`) return null;
    return { name: "Whole × bottom + top", steps: [
      { next: `First: each whole is ${d} pieces. How many pieces are in ${w} whole${w === 1 ? "" : "s"}?`, shown: `${w} × ${d} = ${w * d}`, board: [`${w} ${n}/${d} = (${w} × ${d} + ${n})/${d}`] },
      { next: `Add the ${n} piece${n === 1 ? "" : "s"} from the fraction.`, shown: `${w * d} + ${n} = ${top}`, board: [`${w} ${n}/${d} = (${w} × ${d} + ${n})/${d}`, `= (${w * d} + ${n})/${d}`] },
      { next: "Last: write the pieces over the same bottom.", shown: `${w} ${n}/${d} = ${top}/${d}`, board: [`${w} ${n}/${d} = (${w} × ${d} + ${n})/${d}`, `= (${w * d} + ${n})/${d}`, `= ${top}/${d}`] },
    ] };
  }
  m = /^What is (\d+)% of (\d+)\?$/.exec(text);
  if (m) {
    const pc = Number(m[1]), amount = Number(m[2]), product = pc * amount, value = product / 100;
    if (Math.abs(value - Number(answer.replace(/,/g, ""))) > 1e-9) return null;
    const head = `${pc}% of ${amount}`;
    return { name: "Out of 100", steps: [
      { next: `First: per cent means "out of 100". Write ${pc}% as a fraction.`, shown: `${pc}% = ${pc}/100`, board: [head, `= ${pc}/100 × ${amount}`] },
      { next: `"Of" means multiply. Multiply the top by ${amount}.`, shown: `${pc} × ${amount} = ${product}`, board: [head, `= ${pc}/100 × ${amount}`, `= ${product}/100`] },
      { next: "Last: divide by 100.", shown: `${product} ÷ 100 = ${value}`, board: [head, `= ${pc}/100 × ${amount}`, `= ${product}/100`, `= ${value}`] },
    ] };
  }
  return null;
}

/**
 * facts@1: a times-table fact a child cannot recall is not helped by being told it. Two ways a child is taught to reach
 * it: counting on in equal jumps, and (for the harder facts) building it from the fives fact they know.
 */
function timesFact(prompt: string | undefined, answer: string): { name: string; steps: Worked[] }[] | null {
  const m = prompt ? /^(\d+) × (\d+) = \?$/.exec(prompt.trim()) : null;
  if (!m) return null;
  const a = Number(m[1]), b = Number(m[2]);
  if (a < 2 || b < 2 || a > 12 || b > 12 || String(a * b) !== answer.replace(/,/g, "")) return null;
  // jump in the number that is easier to count in (10s, 5s, 2s; otherwise the larger one, so there are fewer jumps)
  const easy = (x: number) => (x === 10 ? 0 : x === 5 ? 1 : x === 2 ? 2 : 3);
  const [jump, times] = easy(a) < easy(b) || (easy(a) === easy(b) && a >= b) ? [a, b] : [b, a];
  const list = Array.from({ length: times - 1 }, (_, i) => jump * (i + 1));
  const count: Worked[] = [
    { next: `First: count in ${jump}s. ${a} × ${b} is ${times} jumps of ${jump}. Say the first ${times - 1}.`, shown: `${list.join(", ")}` },
    { next: `Last: one more jump of ${jump}.`, shown: `${list[list.length - 1]} + ${jump} = ${a * b}` },
  ];
  const ways = [{ name: `Count in ${jump}s`, steps: count }];
  // from the fives fact: for a fact with a 6, 7, 8 or 9 in it (and not already easy)
  const [keep, split] = a >= b ? [b, a] : [a, b];
  if (split >= 6 && split <= 9 && keep >= 3 && keep !== 5 && keep !== 10) {
    const rest = split - 5;
    ways.push({ name: "From a fact you know", steps: [
      { next: `First: split ${split} into 5 and something.`, shown: `${split} = 5 + ${rest}` },
      { next: `Now the fives fact: ${keep} fives.`, shown: `${keep} × 5 = ${keep * 5}` },
      { next: `And ${keep} lots of ${rest}.`, shown: `${keep} × ${rest} = ${keep * rest}` },
      { next: "Last: add the two parts.", shown: `${keep * 5} + ${keep * rest} = ${a * b}` },
    ] });
  }
  return ways;
}

/**
 * HCF and LCM, each in the three ways schools teach them. The numbers are read from the question's own words; every way
 * must end on the verified answer or it is not offered.
 */
const primesOf = (n: number) => { const out: number[] = []; for (let p = 2; n > 1; p++) while (n % p === 0) { out.push(p); n /= p; } return out; };
const factorsOf = (n: number) => { const out: number[] = []; for (let k = 1; k <= n; k++) if (n % k === 0) out.push(k); return out; };
const times = (xs: number[]) => (xs.length ? xs.join(" × ") : "1");
const gcd2 = (x: number, y: number): number => (y ? gcd2(y, x % y) : x);
function hcfLcm(prompt: string | undefined, answer: string): { name: string; steps: Worked[] }[] | null {
  const m = prompt ? /^What is the (highest common factor \(HCF\)|lowest common multiple \(LCM\)) of ([\d, and]+)\?$/.exec(prompt.trim()) : null;
  if (!m) return null;
  const ns = m[2].split(/,\s*|\s+and\s+/).map((t) => Number(t.trim())).filter((x) => Number.isInteger(x) && x > 0), hcf = /HCF/.test(m[1]);
  if (ns.length < 2 || ns.length > 3 || ns.some((x) => x > 999)) return null;
  const want = hcf ? ns.reduce(gcd2) : ns.reduce((x, y) => (x * y) / gcd2(x, y));
  if (String(want) !== answer) return null;
  const ways: { name: string; steps: Worked[] }[] = [], lists = ns.map(primesOf), all = [...new Set(lists.flat())].sort((x, y) => x - y);
  const count = (list: number[], p: number) => list.filter((x) => x === p).length;
  // 1. prime factors
  const picked = all.flatMap((p) => Array(hcf ? Math.min(...lists.map((l) => count(l, p))) : Math.max(...lists.map((l) => count(l, p)))).fill(p) as number[]);
  if (ns.every((x) => x > 1)) ways.push({ name: "Prime factors", steps: [
    ...ns.map((x, i): Worked => ({ next: `${i === 0 ? "First: " : ""}Write ${x} as a product of primes.`, shown: `${x} is ${times(lists[i])}.` })),
    { next: hcf ? "Which primes are in every list? Take each one as many times as it is in all of them." : "Take every prime, as many times as it appears in the list where it appears most.", shown: picked.length ? `That gives ${times(picked)}.` : "No prime is in every list, so the only common factor is 1." },
    ...(picked.length > 1 ? [{ next: "Multiply them.", shown: `${times(picked)} = ${want}` }] : []),
    { next: `Last: say the ${hcf ? "HCF" : "LCM"}.`, shown: `The ${hcf ? "HCF" : "LCM"} is ${want}.` },
  ] });
  // 2. listing
  if (hcf) {
    const common = factorsOf(ns[0]).filter((k) => ns.every((x) => x % k === 0));
    if (ns.every((x) => factorsOf(x).length <= 16)) ways.push({ name: "List the factors", steps: [
      ...ns.map((x, i): Worked => ({ next: `${i === 0 ? "First: " : ""}List every factor of ${x}.`, shown: `Factors of ${x}: ${factorsOf(x).join(", ")}.` })),
      { next: "Which numbers are in every list?", shown: `Common factors: ${common.join(", ")}.` },
      { next: "Last: the biggest of them is the HCF.", shown: `The HCF is ${want}.` },
    ] });
  } else if (ns.every((x) => want / x <= 12)) {
    ways.push({ name: "List the multiples", steps: [
      ...ns.map((x, i): Worked => ({ next: `${i === 0 ? "First: " : ""}Count in ${x}s.`, shown: `Multiples of ${x}: ${Array.from({ length: want / x }, (_, k) => x * (k + 1)).join(", ")}, …` })),
      { next: "Which is the first number in every list?", shown: `${want} is the first one they share.` },
      { next: "Last: say the LCM.", shown: `The LCM is ${want}.` },
    ] });
  }
  // 3. division
  if (hcf) {
    const steps: Worked[] = []; let g = ns[0];
    ns.slice(1).forEach((x, k) => {
      let big = Math.max(g, x), small = Math.min(g, x);
      if (k > 0) steps.push({ next: `Now do the same with ${g} and the next number, ${x}.`, shown: `The HCF so far is ${g}.` });
      for (let guard = 0; small > 0 && guard < 20; guard++) {
        const q = Math.floor(big / small), r = big - q * small;
        steps.push({ next: `${steps.length === 0 ? "First: divide the bigger number by the smaller. " : ""}Divide ${big} by ${small}. What is left over?`, shown: `${small} × ${q} = ${small * q}. Left over: ${big} − ${small * q} = ${r}` });
        if (r === 0) { g = small; break; }
        steps.push({ next: "Something is left over. What is divided next?", shown: `Divide the divisor, ${small}, by the remainder, ${r}.` });
        big = small; small = r;
      }
    });
    if (g === want) ways.push({ name: "Division method", steps: [...steps, { next: "Last: the divisor that left nothing over is the HCF.", shown: `The HCF is ${want}.` }] });
  } else {
    const rows: number[][] = [ns.slice()], by: number[] = [];
    for (let guard = 0; guard < 20; guard++) { const cur = rows[rows.length - 1], p = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31].find((q) => cur.filter((x) => x % q === 0).length >= 2); if (!p) break; by.push(p); rows.push(cur.map((x) => (x % p === 0 ? x / p : x))); }
    const lastRow = rows[rows.length - 1], parts = [...by, ...lastRow.filter((x) => x !== 1)];
    const board = (k: number) => rows.slice(0, k + 1).map((r, i) => `${i < k ? String(by[i]).padStart(2, " ") : "  "} | ${r.map((x) => String(x).padStart(3, " ")).join(",")}`);
    if (by.length && parts.reduce((x, y) => x * y, 1) === want) ways.push({ name: "Division ladder", steps: [
      ...by.map((p, i): Worked => ({ next: `${i === 0 ? "First: write the numbers in a row. " : ""}Find a prime that divides at least two of ${rows[i].join(", ")}, and divide.`, shown: `Divide by ${p}: ${rows[i + 1].join(", ")}. (A number it does not divide is brought down as it is.)`, board: board(i + 1) })),
      { next: "No prime divides two of them now. Multiply everything down the side and along the bottom.", shown: `${times(parts)} = ${want}`, board: board(by.length) },
      { next: "Last: say the LCM.", shown: `The LCM is ${want}.`, board: board(by.length) },
    ] });
  }
  return ways.length ? ways : null;
}

/** rect@1: the area of a rectangle in three steps: the rule, the multiplication, the unit. */
function rectArea(q: Q): Worked[] | null {
  const m = q.prompt ? /rectangle is (\d+) (\w+) by (\d+) \w+/.exec(q.prompt) : null;
  if (!m) return null;
  const l = Number(m[1]), w = Number(m[3]), unit = m[2];
  if (String(l * w) !== q.answer) return null;
  return [
    { next: "First: write the rule. Area of a rectangle = length × width (rows × columns of unit squares).", shown: `Area = ${l} × ${w}` },
    { next: `Now multiply ${l} by ${w}.`, shown: `${l} × ${w} = ${l * w}` },
    { next: "Last: say it with the unit. Area is counted in squares.", shown: `Area = ${l * w} square ${unit === "cm" ? "centimetres" : unit === "m" ? "metres" : unit}` },
  ];
}
/** one-by-one@1: "how many of these have a line of symmetry" is worked one item at a time, then counted. */
function oneByOne(q: Q): Worked[] | null {
  const yes = String(q.steps?.[0]?.inputs?.[1] ?? "").split(", ").filter(Boolean);
  const axis = String(q.steps?.[0]?.inputs?.[0] ?? "");
  const listed = q.prompt ? /:\s*(.+?)\. How many/.exec(q.prompt) : null;
  if (!listed || !/^(vertical|horizontal)$/.test(axis)) return null;
  const items = listed[1].split(q.family === "aedigsym" ? /,\s*/ : /\s{2,}/).map((x) => x.trim()).filter(Boolean);
  if (items.length < 2 || String(yes.length) !== q.answer || yes.some((y) => !items.includes(y))) return null;
  const fold = axis === "vertical" ? "Fold it up and down the middle: do the left and right halves match?" : "Fold it straight across the middle: do the top and bottom halves match?";
  return [
    ...items.map((x, i) => ({ next: i === 0 ? `First: ${x}. ${fold}` : `Next: ${x}. Same fold: do the halves match?`, shown: `${x}: ${yes.includes(x) ? "yes ✓" : "no"}`, ask: { lead: `${x}: do the halves match? (yes or no)`, value: yes.includes(x) ? "yes" : "no" } })),
    { next: "Last: count the yes ones.", shown: `${yes.length ? yes.join(", ") : "none"}: ${yes.length}`, ask: { lead: `${yes.length ? yes.join(", ") : "none"}: how many?`, value: String(yes.length) } },
  ];
}
/** surds@1 (Class 9 up): simplify, add, take away and multiply surds, and rationalise a denominator, step by step. Each
 *  handler checks its result against the question's own right option and gives up (null) on anything it does not match. */
const M = (x: number) => (x < 0 ? `−${-x}` : String(x));
function simpRoot(n: number): [number, number] { let k = 1, m = n; for (let f = 2; f * f <= m; f++) while (m % (f * f) === 0) { m /= f * f; k *= f; } return [k, m]; }
const surd = (k: number, m: number) => (m === 1 ? M(k) : k === 1 ? `√${m}` : k === -1 ? `−√${m}` : `${M(k)}√${m}`);
const rightOption = (q: Q & { options?: string[] }) => { const i = "ABCDEFGH".indexOf(q.answer); return q.options && i >= 0 ? q.options[i] : null; };
/** a choice question's working ends by finding its result among the options */
const toOption = (q: Q, w: Worked[] | null): Worked[] | null => (w ? [...w.map((x, i) => (i === w.length - 1 && /^Last: /.test(x.next) ? { ...x, next: x.next.replace(/^Last: /, "Next: ") } : x)), { next: "Last: find it among the options.", shown: `${rightOption(q)} is option ${q.answer}` }] : null);
function surdOps(q: Q & { options?: string[] }): Worked[] | null {
  const m = q.prompt ? /^Simplify √(\d+) ([+−×÷]) √(\d+)/.exec(q.prompt) : null, want = rightOption(q);
  if (!m || !want) return null;
  const a = Number(m[1]), b = Number(m[3]);
  if (m[2] === "÷") {
    if (a % b) return null;
    const [k, r] = simpRoot(a / b), res = surd(k, r);
    if (res !== want) return null;
    return [
      { next: "First: put both numbers under one root: √a ÷ √b = √(a ÷ b).", shown: `√${a} ÷ √${b} = √(${a} ÷ ${b}) = √${a / b}` },
      { next: `Last: ${r === 1 ? `${a / b} is a square number, so its root is a whole number` : `take the biggest square number out of ${a / b}`}.`, shown: `√${a / b} = ${res}` },
    ];
  }
  if (m[2] === "×") {
    const [k, r] = simpRoot(a * b), res = surd(k, r);
    if (res !== want) return null;
    return [
      { next: "First: put both numbers under one root: √a × √b = √(a × b).", shown: `√${a} × √${b} = √(${a} × ${b}) = √${a * b}` },
      { next: `Last: take the biggest square number out of ${a * b}.`, shown: `√${a * b} = √(${k * k} × ${r}) = ${res}` },
    ];
  }
  const [k1, r1] = simpRoot(a), [k2, r2] = simpRoot(b);
  if (r1 !== r2 || r1 === 1) return null;
  const k = m[2] === "+" ? k1 + k2 : k1 - k2, res = k === 0 ? "0" : surd(k, r1);
  if (res !== want) return null;
  const step = (n: number, kk: number) => (kk === 1 ? { next: `√${n} is already as simple as it goes.`, shown: `√${n} = √${n}` } : { next: `Take the biggest square number out of ${n}.`, shown: `√${n} = √(${kk * kk} × ${r1}) = ${surd(kk, r1)}` });
  const s1 = step(a, k1), s2 = step(b, k2);
  return [
    { ...s1, next: `First: ${s1.next.charAt(0).toLowerCase()}${s1.next.slice(1)}` },
    { ...s2, next: `Next: now √${b}. ${s2.next}` },
    { next: `Last: they are like surds (both ×√${r1}), so ${m[2] === "+" ? "add" : "take away"} the numbers in front.`, shown: `${surd(k1, r1)} ${m[2]} ${surd(k2, r1)} = ${res}` },
  ];
}
function rationalise(q: Q & { options?: string[] }): Worked[] | null {
  const want = rightOption(q);
  if (!q.prompt || !want) return null;
  const g = (x: number, y: number): number => (y ? g(y, x % y) : Math.abs(x));
  const one = /denominator of (\d+)\/√(\d+) /.exec(q.prompt);
  if (one) {
    const a = Number(one[1]), b = Number(one[2]), d = g(a, b), k = a / d, den = b / d;
    const top = k === 1 ? `√${b}` : `${k}√${b}`, res = den === 1 ? top : `${top}/${den}`;
    if (res !== want) return null;
    return [
      { next: `First: multiply the top and the bottom by √${b}, so the bottom has no root.`, shown: `${a}/√${b} × √${b}/√${b} = ${a}√${b}/${b}` },
      { next: "Last: cancel what the top and the bottom share.", shown: `${a}√${b}/${b} = ${res}` },
    ];
  }
  const two = /denominator of (\d+)\/\(√(\d+) ([+−]) (\d+)\)/.exec(q.prompt);
  if (!two) return null;
  const a = Number(two[1]), b = Number(two[2]), c = Number(two[4]), flip = two[3] === "+" ? "−" : "+", d = b - c * c;
  if (d === 0) return null;
  // a(√b ∓ c)/d, with the sign of d moved to the top
  const sgn = d < 0 ? -1 : 1, k0 = a * sgn, kc0 = a * c * sgn * (flip === "+" ? 1 : -1), h = g(g(k0, kc0), Math.abs(d));
  const D = Math.abs(d) / h, k = k0 / h, kc = kc0 / h;
  const top = `${k === 1 ? "" : k === -1 ? "−" : M(k)}√${b} ${kc < 0 ? "−" : "+"} ${Math.abs(kc)}`;
  const res = D === 1 ? top : `(${top})/${D}`;
  if (res !== want) return null;
  return [
    { next: `First: multiply the top and the bottom by √${b} ${flip} ${c}: the bottom with its sign changed.`, shown: `${a}/(√${b} ${two[3]} ${c}) × (√${b} ${flip} ${c})/(√${b} ${flip} ${c})` },
    { next: `Next: the bottom is now (√${b})² − ${c}², which has no root.`, shown: `(√${b})² − ${c}² = ${b} − ${c * c} = ${M(d)}` },
    { next: `Next: multiply out the top.`, shown: `${a}(√${b} ${flip} ${c}) = ${a}√${b} ${flip} ${a * c}` },
    { next: h > 1 ? `Last: put the top over the bottom, cancel the ${h} they share and tidy the signs.` : "Last: put the top over the bottom and tidy the signs.", shown: `(${a}√${b} ${flip} ${a * c})/${M(d)} = ${res}` },
  ];
}
/** one-term-at-a-time@1: the first four terms of aₙ = (a quadratic in n), each worked by putting n in. */
function termsByRule(q: Q): Worked[] | null {
  const rec = q.prompt ? /a₁ = ([−-]?\d+) and aₙ = ([−-]?)(\d*)aₙ₋₁ ([+−]) (\d+) for n ≥ 2/.exec(q.prompt) : null;
  if (rec) {
    // a₁ given; each next term from the one before
    const N = (t: string) => Number(t.replace("−", "-"));
    const p = (rec[2] ? -1 : 1) * (rec[3] ? Number(rec[3]) : 1), c = (rec[4] === "+" ? 1 : -1) * Number(rec[5]);
    const vals = [N(rec[1])]; for (let i = 1; i < 4; i++) vals.push(p * vals[i - 1] + c);
    if (`(${vals.map(M).join(", ")})` !== q.answer.replace(/-/g, "−")) return null;
    const pre = p === 1 ? "" : p === -1 ? "−" : `${M(p)} × `;
    return [
      { next: "First: a₁ is given.", shown: `a₁ = ${M(vals[0])}` },
      ...[1, 2, 3].map((i) => ({ next: `Next: a${"₁₂₃₄"[i]}: use the one before, a${"₁₂₃₄"[i - 1]} = ${M(vals[i - 1])}.`, shown: `a${"₁₂₃₄"[i]} = ${pre}(${M(vals[i - 1])}) ${rec[4]} ${rec[5]} = ${M(vals[i])}` })),
      { next: "Last: write the four terms in order.", shown: `(${vals.map(M).join(", ")})` },
    ];
  }
  const m = q.prompt ? /aₙ = ([^.]+?)\. Write its first four terms/.exec(q.prompt) : null;
  if (!m || /aₙ₋₁/.test(m[1])) return null;
  const rule = m[1].trim(), js = rule.replace(/−/g, "-").replace(/n²/g, "(n*n)").replace(/(\d)\s*\(/g, "$1*(").replace(/(\d)n/g, "$1*n");
  if (!/^[-+*\s()n\d]+$/.test(js)) return null;
  const f = new Function("n", `return ${js};`) as (n: number) => number;
  const vals = [1, 2, 3, 4].map((n) => f(n));
  if (`(${vals.map(M).join(", ")})` !== q.answer.replace(/-/g, "−")) return null;
  const put = (n: number) => rule.replace(/n²/g, `(${n})²`).replace(/(\d)n\b/g, `$1(${n})`).replace(/(^|[^\d(])n\b/g, `$1(${n})`);
  return [
    ...vals.map((v, i) => ({ next: `${i === 0 ? "First" : "Next"}: a${"₁₂₃₄"[i]}: put n = ${i + 1} into the rule.`, shown: `a${"₁₂₃₄"[i]} = ${put(i + 1)} = ${M(v)}` })),
    { next: "Last: write the four terms in order.", shown: `(${vals.map(M).join(", ")})` },
  ];
}
const HANDLERS: Record<string, (q: Q) => Worked[] | null> = { agptest: primeTest, avdiv: longDivision, ldiv: exactDivision, rect: rectArea, aesym: oneByOne, aedigsym: oneByOne, aesurop: (q) => toOption(q, surdOps(q)), aerat: (q) => toOption(q, rationalise(q)), auaprec: termsByRule };
export const WORKED_OUT: readonly string[] = Object.keys(HANDLERS);
/** methods@1: the school method's name for a type that has one written here (the first tab of its step help). */
const NAMES: Record<string, string> = { agptest: "Try each prime", avdiv: "Long division", ldiv: "Long division", rect: "Length × width", aesym: "One at a time", aedigsym: "One at a time", aesurop: "Simplest surds first", aerat: "Clear the root below", auaprec: "One term at a time" };
/** methods@2: every way written for a question, the taught one first, each with its name; null when none is written. */
/** Ways whose type's own steps are the same method in a shorter form: no second tab is offered beside them. */
export const SOLE_WAYS: readonly string[] = ["Same bottom (LCM)", "Divide", "Whole × bottom + top", "Out of 100"];
export function workedWays(q: Q): { name: string; steps: Worked[] }[] | null {
  try {
    if (Object.prototype.hasOwnProperty.call(HANDLERS, q.family)) { const w = HANDLERS[q.family](q); if (w && w.length >= 2) {
      const usual = { name: NAMES[q.family] ?? "The usual way", steps: w };
      // side-answer@1: the same long division with the answer written at the side ("6 ) 348 ( 58"), as many books set it out
      return q.family === "ldiv" || q.family === "avdiv" ? [usual, { name: "Answer at the side", steps: atTheSide(w) }] : [usual];
    } }
    const c = columns(q.prompt, q.answer);
    if (c && c.length >= 2) return [{ name: "In columns", steps: c }];
    if (q.family === "avpp") { const lm = longMultiply(q); return lm && lm.length >= 2 ? [{ name: "In columns", steps: lm }] : null; }
    const tf = timesFact(q.prompt, q.answer);
    if (tf) return tf;
    const mu = multiply(q.prompt, q.answer);
    if (mu && mu.length >= 2) return [{ name: "In columns", steps: mu }];
    const ff = fractionForms(q.prompt, q.answer);
    if (ff) return [ff];
    const de = decimals(q.prompt, q.answer);
    if (de) return [{ name: "In columns", steps: de }];
    const fr = unlikeFractions(q.prompt, q.answer);
    if (fr) return [{ name: "Same bottom (LCM)", steps: fr }];
    return hcfLcm(q.prompt, q.answer);
  } catch { return null; }
}
/** The full working for a question in the taught method, with that method's name; null when none is written. */
export function workedOut(q: Q): (Worked[] & { method?: string }) | null {
  const ways = workedWays(q);
  return ways ? Object.assign(ways[0].steps, { method: ways[0].name }) : null;
}
