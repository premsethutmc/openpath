import { Poly } from "/home/claude/k052/packages/learning/src/reasoner/domain/poly.ts";
import { Rational } from "/home/claude/k052/packages/learning/src/math-kernel.ts";
// rationalRoots cost grows with (#divisors(a0) x #divisors(an)); a0, an < 1e12 are accepted by the limit.
for (const hc of [720720n, 735134400n, 963761198400n]) {
  const t0 = Date.now();
  const r = new Poly([new Rational(-hc), new Rational(hc)]).rationalRoots().map(String);
  console.log(JSON.stringify({ a0_an: String(hc), roots: r, ms: Date.now() - t0 }));
}
