// Minimal reproductions for the eight post-audit findings. Run: bun research/e7-safety/repro.ts [--json out.json]
// Each row: id, channel, input, observed verdict, expected verdict (per the invariant in DIAGNOSIS.md).
const L = new URL("../../packages/learning/src/", import.meta.url).pathname;
const { assessMathematicalWorking } = await import(L + "unified-math-engine.ts");
const { assessAnswerFirst } = await import(L + "answer-first.ts");
const { parseNaturalWorking } = await import(L + "natural-working.ts");

const v = (n: string) => ({ kind: "variable", name: n }), c = (s: string) => ({ kind: "constant", value: s });
const add = (...t: any[]) => ({ kind: "add", terms: t }), mul = (...f: any[]) => ({ kind: "multiply", factors: f }), pw = (b: any, e: number) => ({ kind: "power", base: b, exponent: e });
const fn = (k: string, a: any) => ({ kind: k, argument: a }), neg = (a: any) => mul(c("-1"), a);
const x = v("x");
type Row = { id: string; channel: string; input: string; observed: string; expected: string[]; note?: string };
const rows: Row[] = [];

async function sym(id: string, label: string, start: any, next: any, expected: string[], assumptions?: any[]) {
  const p: any = { domain: "symbolic", start }; if (assumptions) p.assumptions = assumptions;
  const m: any = await assessMathematicalWorking(p, [{ id: "s0", expression: next }], {});
  rows.push({ id, channel: "symbolic", input: label, observed: m.classification, expected, note: String(m.justification ?? "").slice(0, 120) });
}
async function nat(id: string, problem: any, text: string, expected: string[]) {
  const m: any = await assessMathematicalWorking(problem, { format: "natural", text } as any, {});
  rows.push({ id, channel: "unified-natural", input: `${problem.statement ?? problem.task} | ${text.replace(/\n/g, " / ")}`, observed: m.classification, expected, note: String(m.justification ?? "").slice(0, 120) });
}
function af(id: string, statement: string, text: string, expected: string[]) {
  const a: any = assessAnswerFirst({ domain: "algebra", statement } as any, { format: "natural", text } as any, { diagnose: "always" } as any);
  const tr = (a.diagnosis?.transitions ?? []).map((t: any) => t.status).join(",");
  rows.push({ id, channel: "answer-first", input: `${statement} | ${text.replace(/\n/g, " / ")}`, observed: `${a.answer?.status ?? a.status}${tr ? ` [${tr}]` : ""}`, expected, note: String(a.answer?.reason ?? "").slice(0, 120) });
}
function parse(id: string, text: string, expected: string[]) {
  const r: any = parseNaturalWorking({ format: "natural", text } as any);
  const rel = r.lines?.[0]?.relation, obs = r.classification !== "parsed" ? r.classification : `parsed:${JSON.stringify(rel).replace(/"(kind|name|value|terms|factors|argument|expression|left|right|radicand|base|exponent|index)":/g, "").replace(/"/g, "").slice(0, 60)}`;
  rows.push({ id, channel: "parser", input: text, observed: obs, expected });
}
const ALG = (s: string) => ({ domain: "algebra", statement: s });

// F1 malformed syntax / invented meaning
af("F1a", "sqrt(x+1)=2", "sqrt(x+1 = 2", ["unsupported", "unresolved"]);
await nat("F1b", ALG("sqrt(x+1)=2"), "sqrt(x+1 = 2\nx+1=4\nx=3", ["malformed"]);
parse("F1c", "3sec(3x)tan(3x)", ["unsupported"]);
parse("F1d", "sin x^2", ["ambiguous"]);
parse("F1e", "atan(x)", ["parsed:{atan"]);
parse("F1f", "sqrt(x+1 = 2", ["malformed"]);

// F2 antiderivative outside its domain
const integrand = mul(c("2"), x, pw(add(pw(x, 2), c("-1")), -1));
await nat("F2a", { domain: "calculus", task: "indefinite-integral", integrand, variable: "x" }, "∫2x/(x^2-1) dx = ln(x^2-1) + C", ["missing-assumption", "incomplete", "invalid"]);
await nat("F2b", { domain: "calculus", task: "indefinite-integral", integrand, variable: "x" }, "∫2x/(x^2-1) dx = ln|x^2-1| + C", ["verified"]);
await nat("F2c", { domain: "calculus", task: "indefinite-integral", integrand: pw(x, -1), variable: "x" }, "∫1/x dx = ln(x) + C", ["missing-assumption", "incomplete", "invalid"]);

// F3 canonical-form mismatch treated as disproof
await sym("F3a", "cos(-x) -> cos x", fn("cos", neg(x)), fn("cos", x), ["verified"]);
await sym("F3b", "cos^2 x -> (1+cos 2x)/2", pw(fn("cos", x), 2), mul(add(c("1"), fn("cos", mul(c("2"), x))), c("1/2")), ["verified", "unsupported"]);
await sym("F3c", "cos(2pi/3) -> -1/2", fn("cos", mul(c("2/3"), { kind: "pi" })), c("-1/2"), ["verified", "unsupported"]);
await sym("F3d", "sin(-x) -> sin x  (false)", fn("sin", neg(x)), fn("sin", x), ["invalid", "unsupported (safe: no witness exhibited)"]);

// F4 domain handling depends on notation
await sym("F4a", "6x*6^-1 -> x", mul(c("6"), x, pw(c("6"), -1)), x, ["verified"]);
await sym("F4b", "x^2*(x^3)^-1 -> x^-1", mul(pw(x, 2), pw(pw(x, 3), -1)), pw(x, -1), ["verified"]);
await sym("F4c", "x^-2 -> (x^2)^-1", pw(x, -2), pw(pw(x, 2), -1), ["verified"]);
await sym("F4d", "(x^2-1)^-1 -> ((x-1)(x+1))^-1", pw(add(pw(x, 2), c("-1")), -1), pw(mul(add(x, c("-1")), add(x, c("1"))), -1), ["verified"]);

// F5 assumptions not applied
const P = (e: any) => ({ kind: "positive", expression: e });
await sym("F5a", "ln(x^2) -> 2 ln x  [x>0]", fn("log", pw(x, 2)), mul(c("2"), fn("log", x)), ["verified"], [P(x)]);
await sym("F5b", "|x| -> x  [x>0]", fn("abs", x), x, ["verified"], [P(x)]);
await sym("F5c", "|x+y| -> x+y  [x>0,y>0]", fn("abs", add(x, v("y"))), add(x, v("y")), ["verified"], [P(x), P(v("y"))]);
await sym("F5d", "ln(x^2) -> 2 ln x  (none)", fn("log", pw(x, 2)), mul(c("2"), fn("log", x)), ["missing-assumption", "invalid"]);

// F6 restriction line read as a solution statement
await nat("F6a", ALG("x/(x-2)=3/(x-2)"), "x != 2\nx=3", ["verified"]);
af("F6b", "x/(x-2)=3/(x-2)", "x != 2\nx=3", ["correct [equivalent]"]);
af("F6c", "(x^2-1)/(x-1)=2 for x != 1", "x+1=2\nx=1", ["incorrect [equivalent,equivalent]"]);

// F7 lost solutions graded incomplete
await nat("F7a", ALG("x^2=9"), "x=3", ["invalid"]);
await nat("F7b", ALG("x^3=4x"), "x^2=4\nx=2 or x=-2", ["invalid"]);
af("F7c", "x^3=4x", "x^2=4\nx=2 or x=-2", ["incorrect"]);
await nat("F7d", ALG("x^2>4"), "x>2", ["invalid"]);

// F8 restrictions / unchecked candidates (policy)
await nat("F8a", ALG("x^2/(x-3)=9/(x-3)"), "x^2=9\nx=-3", ["verified (implicit policy)", "incomplete (shown policy)"]);
await nat("F8b", ALG("2x+5=2(x+3)"), "2x+5=2x+6\n5=6\nno solution", ["verified"]);

const ok = (r: Row) => r.expected.some((e) => r.observed.startsWith(e.split(" (")[0]));
for (const r of rows) console.log(`${ok(r) ? "ok  " : "FAIL"} ${r.id.padEnd(4)} ${r.channel.padEnd(15)} ${r.input.slice(0, 58).padEnd(58)} -> ${r.observed.padEnd(28)} want ${r.expected.join("|")}`);
const out = process.argv.indexOf("--json"); if (out > 0) await Bun.write(process.argv[out + 1], JSON.stringify(rows.map((r) => ({ ...r, ok: ok(r) })), null, 1));
process.exit(0);
