/** Exact bounded rational/polynomial arithmetic. No eval, floating sampling or arbitrary CAS claims. */
export type Rational = readonly [bigint, bigint];
const gcd = (a: bigint, b: bigint): bigint =>
  b ? gcd(b, a % b) : a < 0n ? -a : a;
export function rational(n: bigint, d = 1n): Rational {
  if (!d) throw new Error("Zero denominator");
  const g = gcd(n, d),
    sign = d < 0n ? -1n : 1n;
  return [(n / g) * sign, (d / g) * sign];
}
const add = (a: Rational, b: Rational) =>
  rational(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
const mul = (a: Rational, b: Rational) => rational(a[0] * b[0], a[1] * b[1]);
export const show = (r: Rational) =>
  r[1] === 1n ? `${r[0]}` : `${r[0]}/${r[1]}`;
export function parseNumber(text: string): Rational {
  const s = text.trim().replaceAll("−", "-");
  if (s.length > 80 || !/^[+-]?\d+(?:\.\d+)?(?:\/[+-]?\d+)?$/.test(s))
    throw new Error("Enter an integer, decimal or fraction");
  const [a, b = "1"] = s.split("/"),
    [whole, frac = ""] = a.split(".");
  const den = 10n ** BigInt(frac.length);
  return rational(BigInt(whole + frac), den * BigInt(b));
}
export function sameNumber(a: string, b: string) {
  try {
    return show(parseNumber(a)) === show(parseNumber(b));
  } catch {
    return false;
  }
}
type Poly = Rational[];
const zero = (): Rational => [0n, 1n];
function combine(a: Poly, b: Poly, negative = false): Poly {
  return Array.from({ length: Math.max(a.length, b.length) }, (_, i) =>
    add(a[i] ?? zero(), mul(b[i] ?? zero(), [negative ? -1n : 1n, 1n])),
  );
}
function product(a: Poly, b: Poly): Poly {
  if (a.length + b.length > 14)
    throw new Error("Polynomial degree exceeds bound");
  const out = Array.from({ length: a.length + b.length - 1 }, zero);
  a.forEach((v, i) =>
    b.forEach((w, j) => (out[i + j] = add(out[i + j], mul(v, w)))),
  );
  return out;
}
/** Single variable x, + - * /constant, parentheses, integer powers 0..6; implicit multiplication supported. */
export function polynomial(text: string): string {
  if (text.length > 180) throw new Error("Expression too long");
  const s = text
    .replaceAll("−", "-")
    .replaceAll("²", "^2")
    .replaceAll("³", "^3")
    .replace(/\s/g, "");
  const raw = s.match(/\d+(?:\.\d+)?|x|[+*/^()-]/g) ?? [];
  if (raw.join("") !== s || !raw.length)
    throw new Error("Unsupported expression");
  const t: string[] = [];
  raw.forEach((v, i) => {
    const p = raw[i - 1];
    if (
      p &&
      /^(x|\)|\d+(?:\.\d+)?)$/.test(p) &&
      /^(x|\(|\d+(?:\.\d+)?)$/.test(v)
    )
      t.push("*");
    t.push(v);
  });
  let pos = 0;
  const atom = (): Poly => {
    let v: Poly;
    const tok = t[pos++];
    if (tok === "(") {
      v = sum();
      if (t[pos++] !== ")") throw new Error("Parenthesis");
    } else if (tok === "x") v = [zero(), [1n, 1n]];
    else if (tok && /^\d/.test(tok)) v = [parseNumber(tok)];
    else throw new Error("Expected term");
    if (t[pos] === "^") {
      pos++;
      const exponent = t[pos++];
      if (!/^[0-6]$/.test(exponent ?? "")) throw new Error("Power bound");
      const base = v;
      v = [[1n, 1n]];
      for (let i = 0; i < Number(exponent); i++) v = product(v, base);
    }
    return v;
  };
  const unary = (): Poly => {
    if (t[pos] === "+") {
      pos++;
      return unary();
    }
    if (t[pos] === "-") {
      pos++;
      return product([[-1n, 1n]], unary());
    }
    return atom();
  };
  const term = (): Poly => {
    let v = unary();
    while (t[pos] === "*" || t[pos] === "/") {
      const op = t[pos++],
        b = unary();
      if (op === "*") v = product(v, b);
      else {
        if (b.slice(1).some((x) => x[0] !== 0n) || !b[0][0])
          throw new Error("Only nonzero constant division supported");
        v = v.map((x) => mul(x, rational(b[0][1], b[0][0])));
      }
    }
    return v;
  };
  const sum = (): Poly => {
    let v = term();
    while (t[pos] === "+" || t[pos] === "-") {
      const op = t[pos++];
      v = combine(v, term(), op === "-");
    }
    return v;
  };
  const result = sum();
  if (pos !== t.length) throw new Error("Trailing input");
  while (result.length > 1 && result.at(-1)![0] === 0n) result.pop();
  return result.map(show).join(",");
}
export type AnswerSpec = {
  kind: "number" | "polynomial" | "choice" | "set";
  value: string;
};
export function checkAnswer(
  answer: AnswerSpec,
  response: string,
): { correct: boolean; supported: boolean } {
  try {
    if (answer.kind === "number")
      return {
        correct:
          show(parseNumber(answer.value)) === show(parseNumber(response)),
        supported: true,
      };
    if (answer.kind === "polynomial")
      return {
        correct: polynomial(answer.value) === polynomial(response),
        supported: true,
      };
    if (answer.kind === "set") {
      const parts = response.split(",").map((x) => show(parseNumber(x)));
      if (new Set(parts).size !== parts.length)
        return { correct: false, supported: true };
      return {
        correct:
          parts.sort().join(",") ===
          answer.value
            .split(",")
            .map((x) => show(parseNumber(x)))
            .sort()
            .join(","),
        supported: true,
      };
    }
    return {
      correct: response.trim().toUpperCase() === answer.value,
      supported: true,
    };
  } catch {
    return { correct: false, supported: false };
  }
}
