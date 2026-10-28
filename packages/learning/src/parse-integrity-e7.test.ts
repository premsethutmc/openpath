/** E7 repair, Invariants E and F: parse fidelity and capability boundaries. Generated inputs; verdict CLASSES are the property, not strings. */
import { afterAll, describe, expect, test } from "bun:test";
import { assessMathematicalWorking } from "./unified-math-engine.ts";
import { parseNaturalWorking } from "./natural-working.ts";
import { parseFidelityLoss } from "./parse-fidelity.ts";
import { attribute, claimFamily, MECHANISMS } from "./evidence-provenance.ts";
import { stopGeometryWorkers } from "./geometry-worker.ts";
afterAll(() => stopGeometryWorkers());

let seed = 99; const rnd = (n: number) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
const nat = (text: string) => ({ format: "natural" as const, text });
const alg = (statement: string, lines: string[]) => assessMathematicalWorking({ domain: "algebra", statement } as never, nat(lines.join("\n")));
const dec = (n: number) => `${Math.floor(n / 10)}.${n % 10}`;

describe("E: a decimal-leading line keeps its integer part", () => {
  test("c.d·y = k: right root verified, wrong root not, list numbering changes nothing", async () => {
    for (let i = 0; i < 16; i++) {
      const c10 = 11 + rnd(40); if (c10 % 10 === 0) continue; const k = 5 * (1 + rnd(9)), num = k * 10, g = (a: number, b: number): number => (b ? g(b, a % b) : a), d = g(num, c10), root = c10 / d === 1 ? `${num / d}` : `${num / d}/${c10 / d}`;
      const eq = `${dec(c10)}y = ${k}`;
      for (const marker of ["", "1. ", "1) "]) {
        expect((await alg(eq, [marker + eq, `y = ${root}`])).classification).toBe("verified");
        expect((await alg(eq, [marker + eq, `y = ${num / d + 1}/${c10 / d}`])).classification).not.toBe("verified");
      }
      // the line that starts with the decimal is the equation itself, not `${dec(c10).split(".")[1]}y = ${k}`
      expect((await alg(eq, [`${dec(c10).split(".")[1]}y = ${k}`, `y = ${k / Number(dec(c10).split(".")[1])}`])).classification).not.toBe("verified");
    }
  });
});

describe("E: the parse keeps every numeral the student wrote (round trip)", () => {
  test("generated equations parse without loss; deleting any coefficient from the parse is detected", () => {
    for (let i = 0; i < 30; i++) {
      const a = 2 + rnd(9), b = 2 + rnd(9), c = 10 + rnd(90), text = `${a}x^2 + ${b}x - ${c} = ${c + a}`;
      const p = parseNaturalWorking(nat(text)); expect(p.classification).toBe("parsed");
      expect(parseFidelityLoss(text, p.lines[0])).toBeNull();
      const lossy = JSON.parse(JSON.stringify(p.lines[0]).replace(new RegExp(`"value":"${b}"`), '"value":"1"').replace(new RegExp(`"value":"${c}"`), '"value":"0"'));
      expect(parseFidelityLoss(text, lossy)).not.toBeNull();
    }
  });
});

describe("E: a misread is never a proven error", () => {
  const X = { kind: "variable", name: "x" };
  test("evaluation written in words: valid work is never invalid, a wrong value is never verified", async () => {
    for (let i = 0; i < 10; i++) {
      const a = 1 + rnd(3), b = a + 1 + rnd(4), p = { domain: "calculus", task: "definite-integral", integrand: { kind: "multiply", factors: [{ kind: "constant", value: "1" }, { kind: "power", base: X, exponent: -1 }] }, lower: String(a), upper: String(b), variable: "x" };
      const good = `ln(${b}) - ln(${a})`;
      for (const phrase of [`[ln(x)] from ${a} to ${b}`, `[ln(x)] evaluated from ${a} to ${b}`, `[ln(x)] between ${a} and ${b}`]) {
        const ok = await assessMathematicalWorking(p as never, nat(`∫_${a}^${b} 1/x dx = ${phrase} = ${good}`));
        expect(ok.classification).not.toBe("invalid");
        const bad = await assessMathematicalWorking(p as never, nat(`∫_${a}^${b} 1/x dx = ${phrase} = ln(${b + 3}) - ln(${a})`));
        expect(bad.classification).not.toBe("verified");
      }
    }
  });
  test("d/dx 1/x: the extent of the operator is undecided, so valid work is never called invalid", async () => {
    const X2 = { kind: "variable", name: "x" };
    for (let i = 0; i < 6; i++) {
      const n = 1 + rnd(5), p = { domain: "calculus", task: "derivative", expression: { kind: "power", base: X2, exponent: -n }, variable: "x" };
      const r = await assessMathematicalWorking(p as never, nat(`d/dx 1/x^${n} = -${n}/x^${n + 1}`));
      expect(r.classification).not.toBe("invalid");
      const bracket = await assessMathematicalWorking(p as never, nat(`d/dx (1/x^${n}) = -${n}/x^${n + 1}`));
      expect(bracket.classification).toBe("verified");
    }
  });
});

describe("F: a mechanism proves only the families it declares", () => {
  const algebraOnly = Object.values(MECHANISMS).filter((m) => m.families && m.families.length === 1 && m.families[0] === "algebra");
  test("the independent algebra checker's mechanisms are declared algebra-only and are refused for calculus, geometry and probability claims", () => {
    expect(algebraOnly.length).toBeGreaterThanOrEqual(6);
    const claims = { calculus: ["∫ x^2 dx = x^3/3 + C", "d/dx sin(x) = cos(x)", "lim_(x→0) sin(x)/x = 1"], geometry: ["∠ABC = 70°", "angle C = 180° - 110°"], probability: ["P(A) = 1/6", "Var(X) = 21/10"] };
    for (const m of algebraOnly) {
      for (const [fam, list] of Object.entries(claims)) for (const c of list) { expect(claimFamily(c)).toBe(fam); const pv = attribute(m.id, "algebra-text", [], c); expect(pv.trusted).toBe(false); expect(pv.reason).toContain("outside its capability"); }
      for (let i = 0; i < 6; i++) expect(attribute(m.id, "algebra-text", [], `${2 + rnd(8)}x + ${rnd(9)} = ${rnd(50)}`).trusted).toBe(true);
    }
  });
  test("a calculus claim never emerges verified through the algebra route", async () => {
    for (let i = 0; i < 6; i++) {
      const k = 2 + rnd(7), r = await alg(`${k}x = ${k * 3}`, [`${k}x = ${k * 3}`, `x = 3`, `∫ ${k} dx = ${k}x + C`]);
      expect(r.classification).not.toBe("invalid");
    }
  });
});
