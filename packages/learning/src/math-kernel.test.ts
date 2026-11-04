/**
 * Mathematical Kernel — architecture acceptance tests.
 *
 * Tests the general mechanism, not hardcoded examples:
 * - Exact rationals
 * - Expression evaluation, simplification, comparison, rendering
 * - Mathematical state and transformation records
 * - Rule registry with precondition checking and verification
 * - Initial rules: arithmetic, decomposition, fractions, algebra, geometry, comparison
 * - Invalid applications are rejected
 * - The same rule works across different parameters
 */

import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import {
  Rational, Expr, evaluate, renderExpr, exprEquals, substitute, simplify,
  createState, verifyStatement, cloneState, renderStatement,
  createDefaultRegistry,
  type MathExpr, type Bindings, type MathState,
} from "./math-kernel";

// ════════════════════════════════════════════════════════════════════════════════
// Exact Rationals
// ════════════════════════════════════════════════════════════════════════════════

describe("Rational", () => {
  it("reduces fractions on construction", () => {
    const r = new Rational(6, 9);
    assert.equal(r.num, 2);
    assert.equal(r.den, 3);
  });

  it("normalises negative denominator", () => {
    const r = new Rational(3, -5);
    assert.equal(r.num, -3);
    assert.equal(r.den, 5);
  });

  it("arithmetic operations", () => {
    const a = new Rational(1, 3);
    const b = new Rational(1, 6);
    assert.ok(a.add(b).eq(new Rational(1, 2)));
    assert.ok(a.sub(b).eq(new Rational(1, 6)));
    assert.ok(a.mul(b).eq(new Rational(1, 18)));
    assert.ok(a.div(b).eq(new Rational(2)));
  });

  it("throws on division by zero", () => {
    assert.throws(() => new Rational(1, 0));
    assert.throws(() => new Rational(5).div(Rational.zero));
  });

  it("comparison operators", () => {
    const a = new Rational(1, 3);
    const b = new Rational(1, 2);
    assert.ok(a.lt(b));
    assert.ok(b.gt(a));
    assert.ok(!a.eq(b));
    assert.ok(a.le(b));
    assert.ok(b.ge(a));
  });

  it("powers", () => {
    const r = new Rational(2, 3);
    const sq = r.pow(2);
    assert.ok(sq.eq(new Rational(4, 9)));
    const cube = r.pow(3);
    assert.ok(cube.eq(new Rational(8, 27)));
  });

  it("fromNumber handles decimals", () => {
    const r = Rational.fromNumber(0.25);
    assert.ok(r.eq(new Rational(1, 4)));
  });

  it("toString", () => {
    assert.equal(new Rational(3).toString(), "3");
    assert.equal(new Rational(2, 3).toString(), "2/3");
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// Expression AST
// ════════════════════════════════════════════════════════════════════════════════

describe("MathExpr evaluation", () => {
  it("evaluates constants", () => {
    assert.ok(evaluate(Expr.num(42)).eq(new Rational(42)));
  });

  it("evaluates binary operations", () => {
    // (3 + 4) × 2 = 14
    const expr = Expr.mul(Expr.add(Expr.num(3), Expr.num(4)), Expr.num(2));
    assert.ok(evaluate(expr).eq(new Rational(14)));
  });

  it("evaluates with variables", () => {
    // 3x + 7 where x = 4
    const expr = Expr.add(Expr.mul(Expr.num(3), Expr.var("x")), Expr.num(7));
    const bindings: Bindings = new Map([["x", new Rational(4)]]);
    assert.ok(evaluate(expr, bindings).eq(new Rational(19)));
  });

  it("throws on unbound variable", () => {
    assert.throws(() => evaluate(Expr.var("y")));
  });

  it("evaluates fractions", () => {
    const expr = Expr.frac(Expr.num(3), Expr.num(4));
    assert.ok(evaluate(expr).eq(new Rational(3, 4)));
  });

  it("evaluates negation", () => {
    assert.ok(evaluate(Expr.neg(Expr.num(5))).eq(new Rational(-5)));
  });

  it("evaluates powers", () => {
    assert.ok(evaluate(Expr.pow(Expr.num(2), Expr.num(10))).eq(new Rational(1024)));
  });

  it("evaluates quantities (strips unit for numeric value)", () => {
    const expr = Expr.quantity(Expr.num(5), "cm");
    assert.ok(evaluate(expr).eq(new Rational(5)));
  });
});

describe("Expression rendering", () => {
  it("renders simple arithmetic", () => {
    const expr = Expr.add(Expr.num(3), Expr.num(4));
    assert.equal(renderExpr(expr), "3 + 4");
  });

  it("renders coefficient × variable without ×", () => {
    const expr = Expr.mul(Expr.num(3), Expr.var("x"));
    assert.equal(renderExpr(expr), "3x");
  });

  it("renders subtraction with unicode minus", () => {
    const expr = Expr.sub(Expr.num(10), Expr.num(3));
    assert.equal(renderExpr(expr), "10 − 3");
  });

  it("renders negative numbers in parens", () => {
    const expr = Expr.num(-5);
    assert.equal(renderExpr(expr), "(-5)");
  });

  it("renders fractions", () => {
    const expr = Expr.frac(Expr.num(2), Expr.num(3));
    assert.equal(renderExpr(expr), "2/3");
  });

  it("renders quantities with units", () => {
    const expr = Expr.quantity(Expr.num(5), "cm");
    assert.equal(renderExpr(expr), "5 cm");
  });
});

describe("Expression equality", () => {
  it("equal expressions", () => {
    assert.ok(exprEquals(Expr.num(5), Expr.num(5)));
    assert.ok(exprEquals(Expr.var("x"), Expr.var("x")));
    assert.ok(exprEquals(
      Expr.add(Expr.num(1), Expr.num(2)),
      Expr.add(Expr.num(1), Expr.num(2)),
    ));
  });

  it("unequal expressions", () => {
    assert.ok(!exprEquals(Expr.num(5), Expr.num(6)));
    assert.ok(!exprEquals(Expr.var("x"), Expr.var("y")));
    assert.ok(!exprEquals(Expr.num(5), Expr.var("x")));
  });

  it("rational reduction makes 2/4 equal 1/2", () => {
    assert.ok(exprEquals(Expr.num(new Rational(2, 4)), Expr.num(new Rational(1, 2))));
  });
});

describe("Substitution", () => {
  it("replaces a variable", () => {
    const expr = Expr.add(Expr.mul(Expr.num(3), Expr.var("x")), Expr.num(7));
    const result = substitute(expr, "x", Expr.num(4));
    assert.ok(evaluate(result).eq(new Rational(19)));
  });

  it("leaves other variables alone", () => {
    const expr = Expr.add(Expr.var("x"), Expr.var("y"));
    const result = substitute(expr, "x", Expr.num(1));
    assert.ok(exprEquals(result, Expr.add(Expr.num(1), Expr.var("y"))));
  });
});

describe("Simplification", () => {
  it("folds constants", () => {
    const expr = Expr.add(Expr.num(3), Expr.num(4));
    const s = simplify(expr);
    assert.ok(exprEquals(s, Expr.num(7)));
  });

  it("eliminates additive identity", () => {
    assert.ok(exprEquals(simplify(Expr.add(Expr.num(0), Expr.var("x"))), Expr.var("x")));
    assert.ok(exprEquals(simplify(Expr.add(Expr.var("x"), Expr.num(0))), Expr.var("x")));
  });

  it("eliminates multiplicative identity", () => {
    assert.ok(exprEquals(simplify(Expr.mul(Expr.num(1), Expr.var("x"))), Expr.var("x")));
    assert.ok(exprEquals(simplify(Expr.mul(Expr.var("x"), Expr.num(1))), Expr.var("x")));
  });

  it("eliminates multiplication by zero", () => {
    assert.ok(exprEquals(simplify(Expr.mul(Expr.num(0), Expr.var("x"))), Expr.num(0)));
  });

  it("folds x^0 = 1", () => {
    assert.ok(exprEquals(simplify(Expr.pow(Expr.var("x"), Expr.num(0))), Expr.num(1)));
  });

  it("folds x^1 = x", () => {
    assert.ok(exprEquals(simplify(Expr.pow(Expr.var("x"), Expr.num(1))), Expr.var("x")));
  });

  it("double negation", () => {
    assert.ok(exprEquals(simplify(Expr.neg(Expr.neg(Expr.var("x")))), Expr.var("x")));
  });

  it("simplifies fraction of constants", () => {
    const s = simplify(Expr.frac(Expr.num(6), Expr.num(4)));
    assert.ok(s.kind === "num" && s.value.eq(new Rational(3, 2)));
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// Mathematical State
// ════════════════════════════════════════════════════════════════════════════════

describe("MathState", () => {
  it("verifies a true equation", () => {
    const bindings: Bindings = new Map([["x", new Rational(4)]]);
    const stmt = {
      left: Expr.add(Expr.mul(Expr.num(3), Expr.var("x")), Expr.num(7)),
      relation: "=" as const,
      right: Expr.num(19),
    };
    assert.ok(verifyStatement(stmt, bindings));
  });

  it("rejects a false equation", () => {
    const bindings: Bindings = new Map([["x", new Rational(5)]]);
    const stmt = {
      left: Expr.add(Expr.mul(Expr.num(3), Expr.var("x")), Expr.num(7)),
      relation: "=" as const,
      right: Expr.num(19),
    };
    assert.ok(!verifyStatement(stmt, bindings));
  });

  it("verifies inequality", () => {
    const stmt = { left: Expr.num(3), relation: "<" as const, right: Expr.num(5) };
    assert.ok(verifyStatement(stmt, new Map()));
    const stmt2 = { left: Expr.num(5), relation: "<" as const, right: Expr.num(3) };
    assert.ok(!verifyStatement(stmt2, new Map()));
  });

  it("renderStatement", () => {
    const stmt = { left: Expr.num(3), relation: "=" as const, right: Expr.num(3) };
    assert.equal(renderStatement(stmt), "3 = 3");
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// Rule Registry
// ════════════════════════════════════════════════════════════════════════════════

describe("RuleRegistry", () => {
  const registry = createDefaultRegistry();

  it("lists all registered rules", () => {
    const rules = registry.listRules();
    assert.ok(rules.includes("arithmetic.evaluate"));
    assert.ok(rules.includes("decomposition.base-ten"));
    assert.ok(rules.includes("fraction.equivalence"));
    assert.ok(rules.includes("algebra.subtract-both-sides"));
    assert.ok(rules.includes("geometry.rectangle-area"));
    assert.ok(rules.includes("comparison.ordering"));
    assert.ok(rules.length >= 13);
  });

  it("rejects duplicate registration", () => {
    const reg2 = createDefaultRegistry();
    assert.throws(() => reg2.register({
      id: "arithmetic.evaluate",
      appliesTo: [], description: "", precondition: () => null,
      apply: (s) => s, verify: () => true, explain: () => ({ principle: "", action: "", justification: "", beforeText: "", afterText: "" }),
    }));
  });

  it("throws on unknown rule", () => {
    assert.throws(() => registry.applyRule(createState(), "nonexistent.rule", {}));
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// Rule Tests — Arithmetic
// ════════════════════════════════════════════════════════════════════════════════

describe("arithmetic rules", () => {
  const registry = createDefaultRegistry();

  it("evaluate: constant expression", () => {
    const state = createState();
    state.expressions.set("expr", Expr.add(Expr.num(17), Expr.num(25)));
    const tx = registry.applyRule(state, "arithmetic.evaluate", { expression: "expr" });
    const result = tx.after.expressions.get("expr")!;
    assert.ok(evaluate(result).eq(new Rational(42)));
  });

  it("evaluate: rejects missing expression", () => {
    assert.throws(() => registry.applyRule(createState(), "arithmetic.evaluate", { expression: "nope" }));
  });

  it("additive composition", () => {
    const state = createState();
    const tx = registry.applyRule(state, "arithmetic.additive-composition", {
      parts: [300000, 4000, 500, 12], label: "total",
    });
    assert.ok(evaluate(tx.after.expressions.get("total")!).eq(new Rational(304512)));
  });

  it("additive composition: same rule with different params", () => {
    const state = createState();
    const tx = registry.applyRule(state, "arithmetic.additive-composition", {
      parts: [100, 50, 7], label: "total",
    });
    assert.ok(evaluate(tx.after.expressions.get("total")!).eq(new Rational(157)));
  });

  it("multiplicative composition", () => {
    const state = createState();
    const tx = registry.applyRule(state, "arithmetic.multiplicative-composition", {
      factors: [5, 100], label: "contribution",
    });
    assert.ok(evaluate(tx.after.expressions.get("contribution")!).eq(new Rational(500)));
  });

  it("rejects composition with < 2 parts", () => {
    assert.throws(() => registry.applyRule(createState(), "arithmetic.additive-composition", { parts: [1] }));
    assert.throws(() => registry.applyRule(createState(), "arithmetic.multiplicative-composition", { factors: [1] }));
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// Rule Tests — Decomposition
// ════════════════════════════════════════════════════════════════════════════════

describe("decomposition rules", () => {
  const registry = createDefaultRegistry();

  it("base-ten: decomposes 304512", () => {
    const state = createState();
    const tx = registry.applyRule(state, "decomposition.base-ten", { number: 304512 });
    const decomp = tx.after.expressions.get("decomposition")!;
    // The sum of all digit×placeValue components must equal 304512
    assert.ok(evaluate(decomp).eq(new Rational(304512)));
  });

  it("base-ten: decomposes with internal zeros", () => {
    const state = createState();
    const tx = registry.applyRule(state, "decomposition.base-ten", { number: 100007 });
    assert.ok(evaluate(tx.after.expressions.get("decomposition")!).eq(new Rational(100007)));
  });

  it("base-ten: different numbers use the same rule", () => {
    for (const n of [42, 1000, 999999, 10203]) {
      const tx = registry.applyRule(createState(), "decomposition.base-ten", { number: n });
      assert.ok(evaluate(tx.after.expressions.get("decomposition")!).eq(new Rational(n)),
        `Decomposition of ${n} failed`);
    }
  });

  it("base-ten: rejects negative numbers", () => {
    assert.throws(() => registry.applyRule(createState(), "decomposition.base-ten", { number: -5 }));
  });

  it("base-ten: rejects non-integers", () => {
    assert.throws(() => registry.applyRule(createState(), "decomposition.base-ten", { number: 3.5 }));
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// Rule Tests — Fractions
// ════════════════════════════════════════════════════════════════════════════════

describe("fraction rules", () => {
  const registry = createDefaultRegistry();

  it("equivalence: 1/3 × 4/4 = 4/12", () => {
    const state = createState();
    const tx = registry.applyRule(state, "fraction.equivalence", {
      numerator: 1, denominator: 3, factor: 4,
    });
    const before = evaluate(tx.after.expressions.get("fraction-before")!);
    const after = evaluate(tx.after.expressions.get("fraction-after")!);
    assert.ok(before.eq(after));
    assert.ok(after.eq(new Rational(1, 3)));
  });

  it("equivalence: different nonzero scaling factors", () => {
    for (const factor of [2, 3, 5, 7, 10]) {
      const tx = registry.applyRule(createState(), "fraction.equivalence", {
        numerator: 2, denominator: 5, factor,
      });
      const after = evaluate(tx.after.expressions.get("fraction-after")!);
      assert.ok(after.eq(new Rational(2, 5)), `Factor ${factor} failed`);
    }
  });

  it("equivalence: rejects zero factor", () => {
    assert.throws(() => registry.applyRule(createState(), "fraction.equivalence", {
      numerator: 1, denominator: 2, factor: 0,
    }));
  });

  it("equivalence: rejects zero denominator", () => {
    assert.throws(() => registry.applyRule(createState(), "fraction.equivalence", {
      numerator: 1, denominator: 0, factor: 2,
    }));
  });

  it("common denominator: 1/4 and 1/6", () => {
    const tx = registry.applyRule(createState(), "fraction.common-denominator", {
      num1: 1, den1: 4, num2: 1, den2: 6,
    });
    const f1 = evaluate(tx.after.expressions.get("frac1")!);
    const f2 = evaluate(tx.after.expressions.get("frac2")!);
    assert.ok(f1.eq(new Rational(1, 4)));
    assert.ok(f2.eq(new Rational(1, 6)));
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// Rule Tests — Algebra (Equality-preserving operations)
// ════════════════════════════════════════════════════════════════════════════════

describe("algebra rules", () => {
  const registry = createDefaultRegistry();

  function makeEquationState(lhs: MathExpr, rhs: MathExpr, bindings?: Bindings): MathState {
    const state = createState();
    state.statements.push({ left: lhs, relation: "=", right: rhs });
    if (bindings) {
      for (const [k, v] of bindings) state.bindings.set(k, v);
    }
    return state;
  }

  it("subtract-both-sides: 3x + 7 = 19 → 3x = 12", () => {
    // 3x + 7 = 19, x = 4
    const lhs = Expr.add(Expr.mul(Expr.num(3), Expr.var("x")), Expr.num(7));
    const rhs = Expr.num(19);
    const state = makeEquationState(lhs, rhs, new Map([["x", new Rational(4)]]));

    const tx = registry.applyRule(state, "algebra.subtract-both-sides", { value: 7 });
    const afterStmt = tx.after.statements[0];
    // RHS should be 19 - 7 = 12
    assert.ok(evaluate(afterStmt.right, tx.after.bindings).eq(new Rational(12)));
    assert.equal(tx.evidence, "Subtracting the same value from both sides preserves the equality");
  });

  it("divide-both-sides: 3x = 12 → x = 4", () => {
    const lhs = Expr.mul(Expr.num(3), Expr.var("x"));
    const rhs = Expr.num(12);
    const state = makeEquationState(lhs, rhs, new Map([["x", new Rational(4)]]));

    const tx = registry.applyRule(state, "algebra.divide-both-sides", { value: 3 });
    const afterStmt = tx.after.statements[0];
    assert.ok(evaluate(afterStmt.right, tx.after.bindings).eq(new Rational(4)));
  });

  it("divide-both-sides: rejects division by zero", () => {
    const state = makeEquationState(Expr.num(6), Expr.num(6));
    assert.throws(() => registry.applyRule(state, "algebra.divide-both-sides", { value: 0 }));
  });

  it("add-both-sides: x - 5 = 3 → x = 8", () => {
    const lhs = Expr.sub(Expr.var("x"), Expr.num(5));
    const rhs = Expr.num(3);
    const state = makeEquationState(lhs, rhs, new Map([["x", new Rational(8)]]));

    const tx = registry.applyRule(state, "algebra.add-both-sides", { value: 5 });
    const afterStmt = tx.after.statements[0];
    assert.ok(evaluate(afterStmt.right, tx.after.bindings).eq(new Rational(8)));
  });

  it("multiply-both-sides: x/4 = 3 → x = 12", () => {
    const lhs = Expr.div(Expr.var("x"), Expr.num(4));
    const rhs = Expr.num(3);
    const state = makeEquationState(lhs, rhs, new Map([["x", new Rational(12)]]));

    const tx = registry.applyRule(state, "algebra.multiply-both-sides", { value: 4 });
    const afterStmt = tx.after.statements[0];
    assert.ok(evaluate(afterStmt.right, tx.after.bindings).eq(new Rational(12)));
  });

  it("multiply-both-sides: rejects zero factor", () => {
    const state = makeEquationState(Expr.num(3), Expr.num(3));
    assert.throws(() => registry.applyRule(state, "algebra.multiply-both-sides", { value: 0 }));
  });

  it("two-step equation: 3x + 7 = 19 → subtract 7, divide by 3", () => {
    const lhs = Expr.add(Expr.mul(Expr.num(3), Expr.var("x")), Expr.num(7));
    const rhs = Expr.num(19);
    const state = makeEquationState(lhs, rhs, new Map([["x", new Rational(4)]]));

    const tx1 = registry.applyRule(state, "algebra.subtract-both-sides", { value: 7 });
    const tx2 = registry.applyRule(tx1.after, "algebra.divide-both-sides", { value: 3 });

    // After both steps, RHS = 4
    const finalRhs = evaluate(tx2.after.statements[0].right, tx2.after.bindings);
    assert.ok(finalRhs.eq(new Rational(4)));
  });

  it("same rules with different coefficients and values", () => {
    for (const [a, b, x] of [[2, 3, 5], [5, 10, 2], [7, 1, 3]]) {
      const lhs = Expr.add(Expr.mul(Expr.num(a), Expr.var("x")), Expr.num(b));
      const rhs = Expr.num(a * x + b);
      const state = makeEquationState(lhs, rhs, new Map([["x", new Rational(x)]]));

      const tx1 = registry.applyRule(state, "algebra.subtract-both-sides", { value: b });
      const tx2 = registry.applyRule(tx1.after, "algebra.divide-both-sides", { value: a });

      const finalRhs = evaluate(tx2.after.statements[0].right, tx2.after.bindings);
      assert.ok(finalRhs.eq(new Rational(x)), `Failed for ${a}x + ${b} = ${a * x + b}`);
    }
  });

  it("rejects operation on non-equation", () => {
    const state = createState();
    state.statements.push({ left: Expr.num(3), relation: "<", right: Expr.num(5) });
    assert.throws(() => registry.applyRule(state, "algebra.subtract-both-sides", { value: 1 }));
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// Rule Tests — Geometry
// ════════════════════════════════════════════════════════════════════════════════

describe("geometry rules", () => {
  const registry = createDefaultRegistry();

  it("rectangle-area: 5 × 3 = 15", () => {
    const tx = registry.applyRule(createState(), "geometry.rectangle-area", {
      length: 5, width: 3, unit: "cm",
    });
    assert.ok(evaluate(tx.after.expressions.get("area")!).eq(new Rational(15)));
  });

  it("rectangle-area: different dimensions use the same rule", () => {
    for (const [l, w] of [[4, 7], [10, 10], [1, 100]]) {
      const tx = registry.applyRule(createState(), "geometry.rectangle-area", { length: l, width: w });
      assert.ok(evaluate(tx.after.expressions.get("area")!).eq(new Rational(l * w)),
        `Area of ${l}×${w} failed`);
    }
  });

  it("rectangle-area: rejects non-positive dimensions", () => {
    assert.throws(() => registry.applyRule(createState(), "geometry.rectangle-area", { length: 0, width: 5 }));
    assert.throws(() => registry.applyRule(createState(), "geometry.rectangle-area", { length: 5, width: -1 }));
  });

  it("rectangle-perimeter: 5 × 3 → 16", () => {
    const tx = registry.applyRule(createState(), "geometry.rectangle-perimeter", {
      length: 5, width: 3, unit: "cm",
    });
    assert.ok(evaluate(tx.after.expressions.get("perimeter")!).eq(new Rational(16)));
  });

  it("rectangle-perimeter: different dimensions", () => {
    for (const [l, w] of [[4, 7], [10, 10], [1, 100]]) {
      const tx = registry.applyRule(createState(), "geometry.rectangle-perimeter", { length: l, width: w });
      assert.ok(evaluate(tx.after.expressions.get("perimeter")!).eq(new Rational(2 * (l + w))),
        `Perimeter of ${l}×${w} failed`);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// Rule Tests — Comparison
// ════════════════════════════════════════════════════════════════════════════════

describe("comparison rules", () => {
  const registry = createDefaultRegistry();

  it("orders 3 < 5", () => {
    const tx = registry.applyRule(createState(), "comparison.ordering", { left: 3, right: 5 });
    const stmt = tx.after.statements[0];
    assert.equal(stmt.relation, "<");
  });

  it("orders 10 > 7", () => {
    const tx = registry.applyRule(createState(), "comparison.ordering", { left: 10, right: 7 });
    assert.equal(tx.after.statements[0].relation, ">");
  });

  it("equal values", () => {
    const tx = registry.applyRule(createState(), "comparison.ordering", { left: 4, right: 4 });
    assert.equal(tx.after.statements[0].relation, "=");
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// Transformation record integrity
// ════════════════════════════════════════════════════════════════════════════════

describe("transformation records", () => {
  const registry = createDefaultRegistry();

  it("transformation captures before and after state", () => {
    const state = createState();
    state.expressions.set("expr", Expr.add(Expr.num(10), Expr.num(20)));
    const tx = registry.applyRule(state, "arithmetic.evaluate", { expression: "expr" });

    // Before state is the original
    assert.ok(tx.before === state);
    // After state is different
    assert.ok(tx.after !== state);
    // Rule ID is captured
    assert.equal(tx.ruleId, "arithmetic.evaluate");
    // Params are captured
    assert.equal(tx.params.expression, "expr");
    // Evidence is a string
    assert.ok(typeof tx.evidence === "string" && tx.evidence.length > 0);
  });

  it("after-state is generated by the rule, not independently supplied", () => {
    // The transformation's after-state comes from rule.apply, which is verified by rule.verify
    const state = createState();
    state.statements.push({
      left: Expr.add(Expr.mul(Expr.num(3), Expr.var("x")), Expr.num(7)),
      relation: "=",
      right: Expr.num(19),
    });
    state.bindings.set("x", new Rational(4));

    const tx = registry.applyRule(state, "algebra.subtract-both-sides", { value: 7 });

    // The after-state's equation has the correct transformation applied
    const afterRhs = evaluate(tx.after.statements[0].right, tx.after.bindings);
    assert.ok(afterRhs.eq(new Rational(12))); // 19 - 7 = 12
  });

  it("invalid transformation is rejected (not silently accepted)", () => {
    // Try to divide by zero — rule precondition catches it
    const state = createState();
    state.statements.push({ left: Expr.num(6), relation: "=", right: Expr.num(6) });
    assert.throws(() => registry.applyRule(state, "algebra.divide-both-sides", { value: 0 }),
      /Cannot divide by zero/);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// Cross-cutting: the same rule reused across multiple problems
// ════════════════════════════════════════════════════════════════════════════════

describe("rule reuse across families", () => {
  const registry = createDefaultRegistry();

  it("additive composition works for place value AND perimeter", () => {
    // Place value: 300 + 40 + 5
    const tx1 = registry.applyRule(createState(), "arithmetic.additive-composition", {
      parts: [300, 40, 5], label: "number",
    });
    assert.ok(evaluate(tx1.after.expressions.get("number")!).eq(new Rational(345)));

    // Perimeter sides: 5 + 3 + 5 + 3
    const tx2 = registry.applyRule(createState(), "arithmetic.additive-composition", {
      parts: [5, 3, 5, 3], label: "perimeter",
    });
    assert.ok(evaluate(tx2.after.expressions.get("perimeter")!).eq(new Rational(16)));
  });

  it("multiplicative composition works for place value AND area", () => {
    // Place value: 5 × 100 = 500
    const tx1 = registry.applyRule(createState(), "arithmetic.multiplicative-composition", {
      factors: [5, 100], label: "contribution",
    });
    assert.ok(evaluate(tx1.after.expressions.get("contribution")!).eq(new Rational(500)));

    // Area: 5 × 3 = 15
    const tx2 = registry.applyRule(createState(), "arithmetic.multiplicative-composition", {
      factors: [5, 3], label: "area",
    });
    assert.ok(evaluate(tx2.after.expressions.get("area")!).eq(new Rational(15)));
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// Incorrect transformations are rejected
// ════════════════════════════════════════════════════════════════════════════════

describe("rejection of invalid operations", () => {
  const registry = createDefaultRegistry();

  it("fraction equivalence: zero scaling factor", () => {
    assert.throws(() => registry.applyRule(createState(), "fraction.equivalence", {
      numerator: 1, denominator: 2, factor: 0,
    }));
  });

  it("division by zero in equation", () => {
    const state = createState();
    state.statements.push({ left: Expr.num(6), relation: "=", right: Expr.num(6) });
    assert.throws(() => registry.applyRule(state, "algebra.divide-both-sides", { value: 0 }));
  });

  it("multiply equation by zero (loses information)", () => {
    const state = createState();
    state.statements.push({ left: Expr.num(3), relation: "=", right: Expr.num(3) });
    assert.throws(() => registry.applyRule(state, "algebra.multiply-both-sides", { value: 0 }));
  });

  it("rectangle with zero dimension", () => {
    assert.throws(() => registry.applyRule(createState(), "geometry.rectangle-area", { length: 0, width: 5 }));
  });

  it("decomposition of negative number", () => {
    assert.throws(() => registry.applyRule(createState(), "decomposition.base-ten", { number: -42 }));
  });

  it("operate on nonexistent equation", () => {
    assert.throws(() => registry.applyRule(createState(), "algebra.subtract-both-sides", {
      equationIndex: 5, value: 1,
    }));
  });
});
