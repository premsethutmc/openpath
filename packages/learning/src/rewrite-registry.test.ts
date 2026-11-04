import { describe, expect, test } from "bun:test";
import { REGISTRY, parseTree, certifyRewrite, replayRewriteCertificate, REWRITE_CERTIFICATE_VERSION, type RewriteCertificate } from "./rewrite-registry.ts";

const cert = (a: string, b: string): RewriteCertificate | null => { const A = parseTree(a), B = parseTree(b); return A && B ? certifyRewrite(A, B) : null; };
const ok = (a: string, b: string) => { const c = cert(a, b); return !!c && replayRewriteCertificate(c, a, b).ok; };
let seed = 8675309; const rnd = (n: number) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };

describe("rewrite registry: closed, common interface", () => {
  test("every rule has the same shape and the registry is exactly the approved set", () => {
    expect(REGISTRY.map((r) => r.id).sort()).toEqual(["difference-of-squares", "distribute", "distribute-split", "distribute-unevaluated", "evaluate", "evaluate-product", "factor-common", "fraction-chain", "fraction-combine", "fraction-divide", "fraction-multiply", "fraction-regroup", "fraction-scale", "shifted-transfer", "sign-product", "split-additive", "split-multiplicative"]);
    for (const r of REGISTRY) { expect(typeof r.admissible).toBe("function"); expect(["terms", "factors", "node"]).toContain(r.ctx); }
  });
});

describe("certified rewrites carry rule, path, source, replacement, kernel certificate, digest", () => {
  test("place-value split names its rule and the path of the changed expression", () => {
    const c = cert("12*4", "(10+2)*4")!;
    expect(c.version).toBe(REWRITE_CERTIFICATE_VERSION);
    expect(c.steps.map((s) => [s.rule, s.path.join("/"), s.source, s.replacement])).toEqual([["split-additive", "f0", ["12"], ["10", "2"]]]);
    expect(c.steps[0].kernel.replayDigest).toBeTruthy(); expect(c.digest).toMatch(/^[0-9a-f]{64}$/);
    expect(replayRewriteCertificate(c, "12*4", "(10+2)*4").ok).toBe(true);
  });
  test("accepts: split, evaluate (unreduced and reduced), distribute, fraction scale/split, shown transfer", () => {
    for (const [a, b] of [["64+28", "(60+20)+(4+8)"], ["(60+20)+(4+8)", "80+12"], ["80+12", "92"], ["15*6", "(10+5)*6"], ["8*47", "8*(50-3)"], ["8*(50-3)", "400-24"], ["3/4", "1/4+1/4+1/4"], ["6*15", "6*10+6*5"], ["2/3", "4/6"], ["6/10*6/10", "36/100"], ["36/100", "9/25"], ["(4+8+3)/3", "15/3"], ["15/3", "5"], ["64+28", "(64+6)+(28-6)"], ["100-37", "(100-40)+3"], ["5/6", "1/2+1/3"]]) expect([a, b, ok(a, b)]).toEqual([a, b, true]);
  });
  test("refuses (unsupported, not guessed): neutral elements, answer re-expression, unshown partitions, cancelling pads, 2 rewrites hidden in one block", () => {
    for (const [a, b] of [["64+28", "92*1"], ["64+28", "4*23"], ["64+28", "(64+28)*1"], ["64+28", "(92+17)-17"], ["64+28", "91+1"], ["64+28", "100-8"], ["64+28", "70+22"], ["64+28", "64+28+(5-5)"], ["64+28", "92+0"], ["92", "192/2"], ["92", "184/2"], ["x+3", "(x+4713)+3-4713"], ["x+3", "x+3+k-k"]]) expect([a, b, ok(a, b)]).toEqual([a, b, false]);
  });
  test("a false equality is never certified", () => { for (const [a, b] of [["64+28", "(60+20)+(4+9)"], ["12*4", "(10+3)*4"], ["8*47", "8*(50-2)"], ["1/2", "2/5"]]) expect(cert(a, b)).toBeNull(); });
});

describe("domain restrictions and assumptions are preserved", () => {
  test("a rewrite that drops a variable restriction is refused; a vacuous constant one is recorded", () => {
    expect(cert("x/x", "1")).toBeNull(); expect(cert("(x^2-1)/(x-1)", "x+1")).toBeNull();
    const c = cert("(4+8+3)/3", "15/3")!; expect(c).not.toBeNull();
  });
  test("a zero denominator is never certified", () => { expect(cert("5/1", "5/0")).toBeNull(); });
  test("unsupplied assumptions cannot be smuggled in", () => { const A = parseTree("64+28")!, B = parseTree("(60+20)+(4+8)")!; expect(certifyRewrite(A, B, ["x>0"])).toBeNull(); });
});

describe("independent replay", () => {
  const c = cert("37+59", "(30+50)+(7+9)")!;
  test("a tampered certificate (any field) is rejected by digest", () => {
    const t1 = { ...c, steps: [{ ...c.steps[0], replacement: ["31", "49"] }, c.steps[1]] } as RewriteCertificate; expect(replayRewriteCertificate(t1, "37+59", "(30+50)+(7+9)").ok).toBe(false);
    const t2 = { ...c, restrictions: ["x"] } as RewriteCertificate; expect(replayRewriteCertificate(t2, "37+59", "(30+50)+(7+9)").ok).toBe(false);
  });
  test("a certificate for different expressions is rejected", () => { expect(replayRewriteCertificate(c, "37+59", "(31+49)+(6+10)").ok).toBe(false); expect(replayRewriteCertificate(c, "38+59", "(30+50)+(7+9)").ok).toBe(false); });
  test("a rule that is not in the registry is rejected even with a re-computed digest", async () => {
    const { sha256Hex } = await import("./digest.ts"); const body = { ...c, steps: c.steps.map((s) => ({ ...s, rule: "invent-a-constant" })) } as Omit<RewriteCertificate, "digest"> & { digest?: string }; delete body.digest;
    const forged = { ...body, digest: sha256Hex(JSON.stringify(body)) } as RewriteCertificate; const r = replayRewriteCertificate(forged, "37+59", "(30+50)+(7+9)"); expect(r.ok).toBe(false); expect(r.reason).toContain("not in the registry");
  });
  test("a step path that does not exist is rejected", async () => {
    const { sha256Hex } = await import("./digest.ts"); const body = { ...c, steps: c.steps.map((s) => ({ ...s, path: ["t9"] })) } as Omit<RewriteCertificate, "digest"> & { digest?: string }; delete body.digest;
    expect(replayRewriteCertificate({ ...body, digest: sha256Hex(JSON.stringify(body)) } as RewriteCertificate, "37+59", "(30+50)+(7+9)").ok).toBe(false);
  });
});

describe("properties (pseudo-random, fixed seed; not the cases used to design the registry)", () => {
  test("every random registered instance is accepted and every random pad / answer re-expression is refused", () => {
    for (let k = 0; k < 120; k++) {
      let a = 11 + rnd(89), b = 11 + rnd(89); if (a % 10 === 0) a++; if (b % 10 === 0) b++; const t = (n: number) => n - (n % 10), s = a + b;      // no zero digit: a part 0 would be padding, which is refused
      expect(ok(`${a}+${b}`, `(${t(a)}+${t(b)})+(${a % 10}+${b % 10})`)).toBe(true);                       // place value
      const f = 2 + rnd(8), m = 2 + rnd(30); expect(ok(`${m}*${f}`, `${m}*(${f - 1}+1)`) || f - 1 === 0).toBe(true); // split of the factor
      const d = 1 + rnd(9); expect(ok(`${a}+${b}`, `(${a}+${d})+(${b}-${d})`)).toBe(true);                 // shown transfer
      const w = 1 + rnd(500);
      for (const pad of [`${s}*1`, `(${a}+${b})*1`, `(${s}+${w})-${w}`, `${a}+${b}+(${w}-${w})`, `${s}+0`, `${s - 1}+1`, `${s + 5}-5`, `${2 * s}/2`]) expect([pad, ok(`${a}+${b}`, pad)]).toEqual([pad, false]);
      expect(ok(`${a}+${b}`, `(${t(a)}+${t(b)})+(${a % 10}+${(b % 10) + 1})`)).toBe(false);                  // perturbed numeral
    }
  });
});
