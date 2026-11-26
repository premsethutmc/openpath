/**
 * own-numbers@1 (owner, 26 Nov 2026): an explanation whose numbers the learner can change in place. The child taps a
 * number of the example (it sits in a soft tile, not a link), types another, and the whole explanation is written again
 * for it: the words, the steps, the check and the picture. Nothing is fetched and nothing is asked of an AI: the screen
 * carries its numbers, the sums that follow from them, and its sentences with slots, and this file fills them in.
 *
 * A screen's `vary` names its numbers. A number the learner may change is `{ value, min, max }`; a number that follows
 * from others is a sum written as text (`"floor(a / b)"`, `"a % b"`, `"b * q"`). `require` lists what must stay true for
 * the example to make sense (`"a >= b"`), with `note` saying what to try instead.
 *
 * In the text:
 *   {a}                the number a
 *   {@a}               the number a in a tile the learner taps to change
 *   {a|laddu|laddus}   the word for a: "laddu" when a is 1, else "laddus" (the number is not written)
 *   {if r = 0}…{else}…{end}   one of two passages (no nesting); the condition is `sum op sum`, op one of = != < > <= >=
 *
 * Every combination a learner could choose is checked by a test (vary.test.ts): each sentence fills completely, every
 * worked sum on the screen is true, and nothing comes out as a fraction where a whole number is meant.
 */

export interface VaryInput { value: number; min: number; max: number }
export type Vary = Record<string, VaryInput | string>;
export interface VarySpec { vary: Vary; require?: string[]; note?: string }
export type Values = Record<string, number>;
/** A filled sentence: plain text, and the tiles of numbers the learner may change. */
export type Part = string | { tap: string; value: number };

export const isInput = (v: VaryInput | string): v is VaryInput => typeof v === "object";
export const inputsOf = (vary: Vary): string[] => Object.keys(vary).filter((k) => isInput(vary[k]));

// --- a small calculator: numbers, names, + - * / %, brackets, floor() abs() min() max(). Never eval.
type Tok = { t: "n"; v: number } | { t: "id"; v: string } | { t: "op"; v: string };
function lex(s: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    const num = /^\d+(\.\d+)?/.exec(s.slice(i));
    if (num) { out.push({ t: "n", v: Number(num[0]) }); i += num[0].length; continue; }
    const id = /^[A-Za-z_]\w*/.exec(s.slice(i));
    if (id) { out.push({ t: "id", v: id[0] }); i += id[0].length; continue; }
    const op = /^(<=|>=|!=|[-+*/%(),<>=])/.exec(s.slice(i));
    if (op) { out.push({ t: "op", v: op[0] }); i += op[0].length; continue; }
    throw new Error(`own-numbers: cannot read "${s}"`);
  }
  return out;
}
const FN: Record<string, (...x: number[]) => number> = { floor: Math.floor, abs: Math.abs, min: Math.min, max: Math.max, ceil: Math.ceil };
export function calc(expr: string, v: Values): number {
  const ts = lex(expr);
  let p = 0;
  const peek = () => ts[p], take = () => ts[p++];
  const want = (op: string) => { const t = take(); if (!t || t.t !== "op" || t.v !== op) throw new Error(`own-numbers: expected ${op} in "${expr}"`); };
  const atom = (): number => {
    const t = take();
    if (!t) throw new Error(`own-numbers: "${expr}" ends too soon`);
    if (t.t === "n") return t.v;
    if (t.t === "op" && t.v === "-") return -atom();
    if (t.t === "op" && t.v === "(") { const x = sum(); want(")"); return x; }
    if (t.t === "id") {
      if (FN[t.v]) { want("("); const args = [sum()]; while (peek()?.t === "op" && peek()!.v === ",") { take(); args.push(sum()); } want(")"); return FN[t.v](...args); }
      if (!(t.v in v)) throw new Error(`own-numbers: unknown number "${t.v}" in "${expr}"`);
      return v[t.v];
    }
    throw new Error(`own-numbers: cannot read "${expr}"`);
  };
  const prod = (): number => { let x = atom(); while (peek()?.t === "op" && "*/%".includes((peek() as { v: string }).v)) { const o = take()!.v as string, y = atom(); x = o === "*" ? x * y : o === "/" ? x / y : x % y; } return x; };
  const sum = (): number => { let x = prod(); while (peek()?.t === "op" && "+-".includes((peek() as { v: string }).v)) { const o = take()!.v as string, y = prod(); x = o === "+" ? x + y : x - y; } return x; };
  const r = sum();
  if (p !== ts.length) throw new Error(`own-numbers: extra text in "${expr}"`);
  return r;
}
/** A condition `sum op sum`. */
export function holds(cond: string, v: Values): boolean {
  const m = /^(.*?)(<=|>=|!=|<|>|=)(.*)$/.exec(cond);
  if (!m) throw new Error(`own-numbers: no comparison in "${cond}"`);
  const a = calc(m[1], v), b = calc(m[3], v);
  return m[2] === "=" ? a === b : m[2] === "!=" ? a !== b : m[2] === "<" ? a < b : m[2] === ">" ? a > b : m[2] === "<=" ? a <= b : a >= b;
}

/** Every number of the screen, for the learner's chosen inputs (the example's own where none is chosen). */
export function valuesOf(vary: Vary, chosen: Partial<Values> = {}): Values {
  const v: Values = {};
  for (const [k, d] of Object.entries(vary)) v[k] = isInput(d) ? (chosen[k] ?? d.value) : calc(d, v);
  return v;
}
/** The example's own numbers. */
export const firstValues = (vary: Vary): Values => valuesOf(vary);

/** Why a chosen number cannot be used, or null when it can. */
export function refusal(spec: VarySpec, key: string, raw: string, current: Values): string | null {
  const d = spec.vary[key];
  if (!d || !isInput(d)) return "That number follows from the others.";
  const range = `Try a number from ${d.min} to ${d.max}.`;
  if (!/^\d+$/.test(raw.trim())) return range;
  const n = Number(raw);
  if (n < d.min || n > d.max) return range;
  const next = valuesOf(spec.vary, { ...pick(current, inputsOf(spec.vary)), [key]: n });
  if ((spec.require ?? []).some((c) => !holds(c, next))) return spec.note ?? "That one does not work here. Try another number.";
  return null;
}
const pick = (v: Values, keys: string[]) => Object.fromEntries(keys.map((k) => [k, v[k]]));

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 1000) / 1000));
/** The sentence with its slots filled; `{@a}` becomes a tile. */
export function fillParts(text: string, v: Values): Part[] {
  // the passages first: {if c}…{else}…{end}
  const chosen = text.replace(/\{if ([^}]+)\}([\s\S]*?)(?:\{else\}([\s\S]*?))?\{end\}/g, (_, c: string, yes: string, no?: string) => (holds(c, v) ? yes : no ?? ""));
  const out: Part[] = [];
  let last = 0;
  const re = /\{(@?)([A-Za-z_]\w*)(?:\|([^|}]*)\|([^|}]*))?\}/g;
  for (let m = re.exec(chosen); m; m = re.exec(chosen)) {
    const [whole, tap, key, one, many] = m;
    if (!(key in v)) throw new Error(`own-numbers: unknown number "${key}" in "${text}"`);
    if (m.index > last) out.push(chosen.slice(last, m.index));
    if (one !== undefined) out.push(v[key] === 1 ? one : many);
    else if (tap) out.push({ tap: key, value: v[key] });
    else out.push(fmt(v[key]));
    last = m.index + whole.length;
  }
  if (last < chosen.length) out.push(chosen.slice(last));
  // join neighbouring text so a sentence stays one piece of text where no tile breaks it
  return out.reduce<Part[]>((a, x) => (typeof x === "string" && typeof a[a.length - 1] === "string" ? [...a.slice(0, -1), (a[a.length - 1] as string) + x] : [...a, x]), []);
}
/** The sentence as plain text (tiles written as their numbers). */
export const fill = (text: string, v: Values): string => fillParts(text, v).map((p) => (typeof p === "string" ? p : fmt(p.value))).join("");

/** A scene description with its numbers filled: a field written "{a}" becomes the number a, other text is filled. */
export function fillScene<T>(scene: T, v: Values): T {
  const walk = (x: unknown): unknown => {
    if (typeof x === "string") { const m = /^\{([A-Za-z_]\w*)\}$/.exec(x); return m && m[1] in v ? v[m[1]] : fill(x, v); }
    if (Array.isArray(x)) return x.map(walk);
    if (x && typeof x === "object") return Object.fromEntries(Object.entries(x).map(([k, y]) => [k, walk(y)]));
    return x;
  };
  return walk(scene) as T;
}

/** Every choice of numbers a learner could make (each input over its range), that keeps `require`. */
export function* everyChoice(spec: VarySpec): Generator<Values> {
  const keys = inputsOf(spec.vary);
  const ranges = keys.map((k) => { const d = spec.vary[k] as VaryInput; return Array.from({ length: d.max - d.min + 1 }, (_, i) => d.min + i); });
  const go = function* (i: number, acc: Values): Generator<Values> {
    if (i === keys.length) { const v = valuesOf(spec.vary, acc); if ((spec.require ?? []).every((c) => holds(c, v))) yield v; return; }
    for (const n of ranges[i]) yield* go(i + 1, { ...acc, [keys[i]]: n });
  };
  yield* go(0, {});
}

/**
 * The worked sums in a line of text that can be checked: `12 ÷ 3 = 4`, `3 × 4 + 1 = 13`, `13 ÷ 3 = 4 remainder 1`.
 * Returns the sums that are false (empty when every sum on the line is true).
 */
export function falseSums(line: string): string[] {
  const bad: string[] = [];
  const t = line.replace(/−/g, "-").replace(/×/g, "*").replace(/÷/g, "/");
  // a chain of whole numbers joined by + - * / (brackets allowed), "=", a whole number, maybe "remainder n"
  const re = /((?:\(?\s*\d+\s*\)?\s*[-+*/]\s*)+\(?\s*\d+\s*\)?)\s*=\s*(\d+)(\s*remainder\s*(\d+))?/g;
  for (let m = re.exec(t); m; m = re.exec(t)) {
    const [whole, lhs, rhs, , rem] = m;
    // a minus right before the sum ("−3 × 4") belongs to it; such lines are left to their own checks
    if (m.index > 0 && /[-\d]\s*$/.test(t.slice(0, m.index))) continue;
    try {
      if (rem !== undefined) {
        const d = /^\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(lhs);
        if (!d) { bad.push(whole); continue; }
        const [a, b, q, r] = [Number(d[1]), Number(d[2]), Number(rhs), Number(rem)];
        if (!(b > 0 && a === b * q + r && r >= 0 && r < b)) bad.push(whole);
      } else {
        const x = calc(lhs, {});
        if (Math.abs(x - Number(rhs)) > 1e-9) bad.push(whole);
      }
    } catch { bad.push(whole); }
  }
  return bad;
}
