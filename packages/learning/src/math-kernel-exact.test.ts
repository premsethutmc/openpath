/**
 * Exactness of the kernel's arithmetic (K02) and the comparison rule.
 *
 * Every case here produced a wrong or unchecked result with the previous number-based Rational:
 * products past 2^53 were silently rounded, NaN was accepted as a value, and the comparison rule "verified"
 * 2/5 < 3/5 after reading both sides as NaN.
 */
import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { Rational, parseRational, createDefaultRegistry, createState, Expr, evaluate } from "./math-kernel";

describe("exact rational arithmetic", () => {
  it("multiplies past 2^53 without rounding", () => {
    const a = new Rational(1, 3037000499);
    const sq = a.mul(a);
    assert.equal(sq.denBig, 3037000499n * 3037000499n);
    assert.equal(sq.numBig, 1n);
  });

  it("adds fractions whose cross products exceed 2^53 exactly", () => {
    const x = new Rational(123456789, 987654321).add(new Rational(987654321, 123456789));
    // Expected value computed independently with Python's fractions.Fraction.
    assert.equal(x.toString(), "12230896747409402/1505341124847349");
    assert.ok(x.sub(new Rational(987654321, 123456789)).eq(new Rational(123456789, 987654321)));
  });

  it("raises to large integer powers exactly", () => {
    assert.equal(new Rational(3).pow(40).numBig, 3n ** 40n);
    assert.equal(new Rational(2, 3).pow(-5).toString(), "243/32");
  });

  it("reads decimals as the decimal written, including exponent notation", () => {
    assert.equal(Rational.fromNumber(0.1).toString(), "1/10");
    assert.equal(Rational.fromNumber(2.5).toString(), "5/2");
    assert.equal(Rational.fromNumber(1e-7).toString(), "1/10000000");
    assert.equal(new Rational(2.5).toString(), "5/2");
  });

  it("refuses NaN, Infinity and integers beyond exact JS range instead of guessing", () => {
    assert.throws(() => new Rational(NaN));
    assert.throws(() => new Rational(Infinity));
    assert.throws(() => new Rational(2 ** 53 + 2));
    assert.ok(new Rational(2n ** 80n).eq(new Rational(2).pow(80)));
  });

  it("num/den throw rather than round once a value no longer fits a JS number", () => {
    const big = new Rational(2).pow(60);
    assert.throws(() => big.num, RangeError);
    assert.equal(big.numBig, 2n ** 60n);
    assert.equal(new Rational(6, 4).num, 3);
  });

  it("evaluates expressions with large intermediate values exactly", () => {
    const e = Expr.sub(Expr.mul(Expr.num(new Rational(10n ** 20n)), Expr.num(3)), Expr.num(new Rational(3n * 10n ** 20n - 1n)));
    assert.ok(evaluate(e).eq(new Rational(1)));
  });
});

describe("parseRational", () => {
  it("reads integers, fractions, decimals and the Unicode minus", () => {
    assert.equal(parseRational("7")!.toString(), "7");
    assert.equal(parseRational("-3/4")!.toString(), "-3/4");
    assert.equal(parseRational("−1/2")!.toString(), "-1/2");
    assert.equal(parseRational("2.5")!.toString(), "5/2");
    assert.equal(parseRational("1.5/0.5")!.toString(), "3");
  });
  it("returns null for text it cannot read exactly, and for a zero denominator", () => {
    assert.equal(parseRational("2/0"), null);
    assert.equal(parseRational("x/2"), null);
    assert.equal(parseRational("√2"), null);
    assert.equal(parseRational(NaN), null);
  });
});

describe("comparison.ordering", () => {
  const registry = createDefaultRegistry();

  it("orders fractions given as text exactly", () => {
    const t = registry.applyRule(createState(), "comparison.ordering", { left: "2/5", right: "3/5", claimed: "<" });
    assert.equal(t.after.statements.at(-1)!.relation, "<");
  });

  it("refuses a false claimed relation", () => {
    assert.throws(() => registry.applyRule(createState(), "comparison.ordering", { left: "3/5", right: "2/5", claimed: "<" }));
    assert.throws(() => registry.applyRule(createState(), "comparison.ordering", { left: "2/4", right: "1/2", claimed: "<" }));
  });

  it("refuses values it cannot read instead of comparing NaN", () => {
    assert.throws(() => registry.applyRule(createState(), "comparison.ordering", { left: "two fifths", right: "3/5" }));
  });

  it("distinguishes values that differ only beyond double precision", () => {
    const a = new Rational(2n ** 60n + 1n);
    const b = new Rational(2n ** 60n);
    const t = registry.applyRule(createState(), "comparison.ordering", { left: a, right: b, claimed: ">" });
    assert.equal(t.after.statements.at(-1)!.relation, ">");
  });
});
