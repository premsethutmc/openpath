/**
 * K02 benchmark, step 1 of 2: compute 10,000 seeded arithmetic results with the OpenPath kernel's Rational.
 * Step 2 (check.py) recomputes every case independently with SymPy and counts disagreements.
 *
 *   node --import tsx tools/mathematics/engine-trial/k02-arithmetic.mts out/k02.json [seed]
 *
 * Inputs are written as exact text ("-7/12", "12.3456", "123456789012345678901") so the checker never sees a
 * value the kernel produced. A case the kernel refuses (throws) is recorded as refused, never as a result.
 */
import { writeFileSync } from "node:fs";
import { Rational, Expr, evaluate } from "../../../packages/learning/src/math-kernel";
import { rng } from "./rng.mts";

const [, , outPath = "k02.json", seedArg = "20261023"] = process.argv;
const seed = Number(seedArg);
const r = rng(seed);

type Case = { id: string; category: string; op: string; args: string[]; result: string | null; refused?: string };

/** Build a kernel Rational from exact text, the way a caller would: numbers when they are exact, else bigints. */
function fromText(t: string): Rational {
  if (t.includes(".")) return Rational.fromNumber(Number(t)); // decimals arrive as JS numbers in real use
  const [n, d = "1"] = t.split("/");
  const asArg = (s: string) => (Number.isSafeInteger(Number(s)) ? Number(s) : BigInt(s));
  return new Rational(asArg(n) as never, asArg(d) as never);
}

const frac = (n: bigint | number, d: bigint | number) => `${n}/${d}`;
/** A decimal with 1–4 places and a nonzero fractional part (so it is never 0 and is safe as a divisor). */
const dec = () => {
  const places = r.int(1, 4);
  const frac = String(r.int(1, 10 ** places - 1)).padStart(places, "0");
  return `${r.next() < 0.3 ? "-" : ""}${r.int(0, 999)}.${frac}`;
};

const PLAN: [category: string, count: number, make: () => { op: string; args: string[] }][] = [
  ["integer-small", 2000, () => ({ op: r.pick(["add", "sub", "mul", "div"]), args: [String(r.int(-1000, 1000)), String(r.nz(-1000, 1000))] })],
  ["integer-large", 1500, () => ({ op: r.pick(["add", "sub", "mul", "div"]), args: [String(r.big(r.int(10, 30))), String(r.big(r.int(10, 30)))] })],
  ["fraction", 2500, () => ({ op: r.pick(["add", "sub", "mul", "div", "lt"]), args: [frac(r.nz(-999999, 999999), r.int(1, 999999)), frac(r.nz(-999999, 999999), r.int(1, 999999))] })],
  ["decimal", 1500, () => ({ op: r.pick(["add", "sub", "mul", "div"]), args: [dec(), dec()] })],
  ["power", 1500, () => ({ op: "pow", args: [frac(r.nz(-30, 30), r.int(1, 30)), String(r.int(-12, 20))] })],
  ["expression", 1000, () => ({ op: "expr", args: [frac(r.nz(-500, 500), r.int(1, 500)), frac(r.nz(-500, 500), r.int(1, 500)), frac(r.nz(-500, 500), r.int(1, 500)), String(r.int(2, 9))] })],
];

function compute(op: string, a: string[]): string {
  const [x, y] = [fromText(a[0]), a[1] !== undefined && op !== "pow" ? fromText(a[1]) : null];
  switch (op) {
    case "add": return x.add(y!).toString();
    case "sub": return x.sub(y!).toString();
    case "mul": return x.mul(y!).toString();
    case "div": return x.div(y!).toString();
    case "lt": return String(x.lt(y!));
    case "pow": return x.pow(Number(a[1])).toString();
    case "expr": {
      // (a + b) × c ÷ (a − c) ^ k, through the expression evaluator
      const [A, B, C] = a.slice(0, 3).map((t) => Expr.num(fromText(t)));
      const e = Expr.div(Expr.mul(Expr.add(A, B), C), Expr.pow(Expr.sub(A, C), Expr.num(Number(a[3]))));
      return evaluate(e).toString();
    }
  }
  throw new Error(`unknown op ${op}`);
}

const cases: Case[] = [];
for (const [category, count, make] of PLAN) {
  for (let i = 0; i < count; i++) {
    const { op, args } = make();
    const c: Case = { id: `${category}-${i}`, category, op, args, result: null };
    try {
      c.result = compute(op, args);
    } catch (e) {
      c.refused = (e as Error).message.slice(0, 120);
    }
    cases.push(c);
  }
}

writeFileSync(outPath, JSON.stringify({ benchmark: "k02-arithmetic", seed, count: cases.length, cases }));
console.log(`k02: ${cases.length} cases, ${cases.filter((c) => c.refused).length} refused → ${outPath}`);
