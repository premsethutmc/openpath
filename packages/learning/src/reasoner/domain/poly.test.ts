// D0 gate: Poly and RatFun must agree exactly with SymPy on 5,000 randomised cases (expected values from gen_poly_cases.py).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Rational, parseRational } from "../../math-kernel.ts";
import { Poly, RatFun } from "./poly.ts";
import { parseExpr } from "../expr-text.ts";

const cases = JSON.parse(readFileSync(new URL("../../../../../tools/mathematics/domain-reasoner/poly-cases.json", import.meta.url), "utf8")) as any[];
const P = (xs: string[]) => new Poly(xs.map((s) => parseRational(s)!));
const S = (p: Poly) => p.c.map((v) => v.toString());
test("D0: 5,000 randomised cases agree with SymPy", () => {
  let n = 0;
  for (const c of cases) {
    if (c.kind === "poly") {
      const a = P(c.a), b = P(c.b);
      assert.deepEqual(S(a.add(b)), c.add); assert.deepEqual(S(a.mul(b)), c.mul);
      if (!(a.isZero() && b.isZero())) assert.deepEqual(S(a.gcd(b)), c.gcd);
      if (!b.isZero()) { const { q, r } = a.divmod(b); assert.deepEqual(S(q), c.divq); assert.deepEqual(S(r), c.divr); }
      if (c.squarefreeA) assert.deepEqual(S(a.squarefree()), c.squarefreeA);
      if (c.rootsA) assert.deepEqual(a.rationalRoots().map(String), c.rootsA);
      if ("splitA" in c) {
        const s = a.splitLinear();
        if (c.splitA === null) assert.equal(s, null, `should not split: ${a}`);
        else { assert.ok(s, `should split: ${a}`); assert.deepEqual(s!.roots.map(String).sort((x, y) => (parseRational(x)!.lt(parseRational(y)!) ? -1 : 1)), c.splitA.roots); }
      }
    } else {
      const f = RatFun.fromExpr(parseExpr(c.text));
      assert.ok(f, c.text); const r = f!.reduce();
      assert.deepEqual(S(r.n), c.n, c.text); assert.deepEqual(S(r.d), c.d, c.text);
    }
    n++;
  }
  assert.equal(n, 5000);
});
