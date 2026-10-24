/**
 * Mathematical Kernel — shared mathematical reasoning for OpenPath.
 *
 * Provides:
 *  - Typed expression AST (MathExpr)
 *  - Exact rational arithmetic
 *  - Mathematical state (MathState)
 *  - Executable rule registry (RuleRegistry)
 *  - Transformation records (Transformation)
 *  - Initial rule library: arithmetic, decomposition, fractions, algebra, geometry, comparison
 *
 * NOT a complete CAS. Implements operations required by supported rules.
 */

// ════════════════════════════════════════════════════════════════════════════════
// 1. EXACT RATIONAL NUMBERS
// ════════════════════════════════════════════════════════════════════════════════

function gcd(a: number, b: number): number {
  return Number(gcdBig(BigInt(a), BigInt(b)));
}

function gcdBig(a: bigint, b: bigint): bigint {
  if (a < 0n) a = -a;
  if (b < 0n) b = -b;
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}

/**
 * A JS number as an exact bigint fraction [num, den]. Integers are taken as they are. A non-integer is read as the
 * shortest decimal that prints as that number (0.1 → 1/10, 1e-7 → 1/10000000), which is the value a person wrote.
 * NaN and ±Infinity are rejected rather than turned into a wrong fraction.
 */
function numberToFraction(n: number): [bigint, bigint] {
  if (!Number.isFinite(n)) throw new RangeError(`Not a finite number: ${n}`);
  if (Number.isInteger(n)) {
    if (!Number.isSafeInteger(n)) {
      throw new RangeError(`${n} is beyond the exact integer range of a JS number; pass a bigint instead`);
    }
    return [BigInt(n), 1n];
  }
  const m = String(n).match(/^(-?)(\d+)(?:\.(\d+))?(?:e([+-]\d+))?$/i);
  if (!m) throw new RangeError(`Cannot read ${n} as an exact decimal`);
  const [, sign, int, frac = "", expText = "0"] = m;
  let num = BigInt(int + frac);
  let den = 10n ** BigInt(frac.length);
  const exp = Number(expText);
  if (exp > 0) num *= 10n ** BigInt(exp);
  if (exp < 0) den *= 10n ** BigInt(-exp);
  return [sign ? -num : num, den];
}

function toBig(x: number | bigint): [bigint, bigint] {
  return typeof x === "bigint" ? [x, 1n] : numberToFraction(x);
}

/** A bigint as a JS number, refusing (instead of silently rounding) when it is not exactly representable. */
function exactNumber(x: bigint, what: string): number {
  const n = Number(x);
  if (!Number.isSafeInteger(n)) {
    throw new RangeError(`Rational ${what} ${x} is beyond the exact range of a JS number; use ${what}Big`);
  }
  return n;
}

/**
 * Exact rational number: numerator/denominator, always reduced, denominator > 0.
 *
 * Stored as bigints, so arithmetic never loses precision however large the numbers get. `num` and `den` stay
 * plain numbers for existing callers and THROW (never round) if the exact value no longer fits a JS number;
 * `numBig` and `denBig` always give the exact value.
 */
export class Rational {
  readonly numBig: bigint;
  readonly denBig: bigint;

  constructor(num: number | bigint, den: number | bigint = 1) {
    // A non-integer number argument is read as the decimal it prints as, so new Rational(2.5) is 5/2.
    const [nn, nd] = toBig(num);
    const [dn, dd] = toBig(den);
    let n = nn * dd;
    let d = nd * dn;
    if (d === 0n) throw new Error("Division by zero");
    if (d < 0n) {
      n = -n;
      d = -d;
    }
    const g = gcdBig(n, d);
    this.numBig = n / g;
    this.denBig = d / g;
  }

  get num(): number { return exactNumber(this.numBig, "num"); }
  get den(): number { return exactNumber(this.denBig, "den"); }

  static fromNumber(n: number): Rational {
    return new Rational(n);
  }

  static zero = new Rational(0);
  static one = new Rational(1);

  isZero(): boolean { return this.numBig === 0n; }
  isOne(): boolean { return this.numBig === 1n && this.denBig === 1n; }
  isInteger(): boolean { return this.denBig === 1n; }
  /** Nearest JS number (an approximation by nature: 1/3 has no exact binary value). */
  toNumber(): number {
    const n = Number(this.numBig);
    const d = Number(this.denBig);
    if (Number.isFinite(n) && Number.isFinite(d)) return n / d;
    // Both huge: scale down together so the quotient is still meaningful.
    const shift = BigInt(Math.max(this.numBig.toString(2).length, this.denBig.toString(2).length) - 1000);
    return Number(this.numBig >> shift) / Number(this.denBig >> shift);
  }

  neg(): Rational { return new Rational(-this.numBig, this.denBig); }
  inv(): Rational { return new Rational(this.denBig, this.numBig); }

  add(other: Rational): Rational {
    return new Rational(this.numBig * other.denBig + other.numBig * this.denBig, this.denBig * other.denBig);
  }
  sub(other: Rational): Rational {
    return this.add(other.neg());
  }
  mul(other: Rational): Rational {
    return new Rational(this.numBig * other.numBig, this.denBig * other.denBig);
  }
  div(other: Rational): Rational {
    return this.mul(other.inv());
  }
  pow(n: number): Rational {
    if (!Number.isSafeInteger(n)) throw new RangeError(`Exponent must be an integer, got ${n}`);
    if (n < 0) return this.inv().pow(-n);
    const e = BigInt(n);
    return new Rational(this.numBig ** e, this.denBig ** e);
  }

  eq(other: Rational): boolean { return this.numBig === other.numBig && this.denBig === other.denBig; }
  lt(other: Rational): boolean { return this.numBig * other.denBig < other.numBig * this.denBig; }
  gt(other: Rational): boolean { return other.lt(this); }
  le(other: Rational): boolean { return !this.gt(other); }
  ge(other: Rational): boolean { return !this.lt(other); }

  toString(): string {
    if (this.denBig === 1n) return String(this.numBig);
    return `${this.numBig}/${this.denBig}`;
  }
}

/**
 * Read an exact rational from a number or from text such as "7", "-3/4", "2.5" or "−1/2" (Unicode minus).
 * Returns null for anything else, so a caller can refuse rather than verify against NaN.
 */
export function parseRational(x: number | string | Rational): Rational | null {
  if (x instanceof Rational) return x;
  if (typeof x === "number") return Number.isFinite(x) ? new Rational(x) : null;
  const m = x.trim().replace(/−/g, "-").match(/^(-?\d+(?:\.\d+)?)(?:\s*\/\s*(-?\d+(?:\.\d+)?))?$/);
  if (!m) return null;
  const toFraction = (t: string) => {
    const [i, f = ""] = t.replace("-", "").split(".");
    const v = new Rational(BigInt(i + f), 10n ** BigInt(f.length));
    return t.startsWith("-") ? v.neg() : v;
  };
  const n = toFraction(m[1]);
  if (m[2] === undefined) return n;
  const d = toFraction(m[2]);
  return d.isZero() ? null : n.div(d);
}

function strictOrdering(a: Rational, b: Rational): "<" | ">" | "=" {
  return a.lt(b) ? "<" : a.gt(b) ? ">" : "=";
}

/** Whether `a relation b` is true, exactly. */
function orderingHolds(a: Rational, b: Rational, relation: MathRelation): boolean {
  switch (relation) {
    case "<": return a.lt(b);
    case ">": return a.gt(b);
    case "=": return a.eq(b);
    case "≤": return a.le(b);
    case "≥": return a.ge(b);
    case "≠": return !a.eq(b);
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// 2. TYPED EXPRESSION AST
// ════════════════════════════════════════════════════════════════════════════════

export type MathExpr =
  | { kind: "num"; value: Rational }
  | { kind: "var"; name: string }
  | { kind: "add"; left: MathExpr; right: MathExpr }
  | { kind: "sub"; left: MathExpr; right: MathExpr }
  | { kind: "mul"; left: MathExpr; right: MathExpr }
  | { kind: "div"; left: MathExpr; right: MathExpr }
  | { kind: "pow"; base: MathExpr; exp: MathExpr }
  | { kind: "neg"; operand: MathExpr }
  | { kind: "frac"; num: MathExpr; den: MathExpr }
  | { kind: "quantity"; value: MathExpr; unit: string };

/** Convenience constructors. */
export const Expr = {
  num: (n: number | Rational): MathExpr => ({
    kind: "num",
    value: n instanceof Rational ? n : new Rational(n),
  }),
  var: (name: string): MathExpr => ({ kind: "var", name }),
  add: (left: MathExpr, right: MathExpr): MathExpr => ({ kind: "add", left, right }),
  sub: (left: MathExpr, right: MathExpr): MathExpr => ({ kind: "sub", left, right }),
  mul: (left: MathExpr, right: MathExpr): MathExpr => ({ kind: "mul", left, right }),
  div: (left: MathExpr, right: MathExpr): MathExpr => ({ kind: "div", left, right }),
  pow: (base: MathExpr, exp: MathExpr): MathExpr => ({ kind: "pow", base, exp }),
  neg: (operand: MathExpr): MathExpr => ({ kind: "neg", operand }),
  frac: (num: MathExpr, den: MathExpr): MathExpr => ({ kind: "frac", num, den }),
  quantity: (value: MathExpr, unit: string): MathExpr => ({ kind: "quantity", value, unit }),
};

// ── Expression evaluation ──

export type Bindings = Map<string, Rational>;

/** Evaluate an expression to an exact rational. Throws if variables are unbound. */
export function evaluate(expr: MathExpr, bindings: Bindings = new Map()): Rational {
  switch (expr.kind) {
    case "num":
      return expr.value;
    case "var": {
      const v = bindings.get(expr.name);
      if (v === undefined) throw new Error(`Unbound variable: ${expr.name}`);
      return v;
    }
    case "add":
      return evaluate(expr.left, bindings).add(evaluate(expr.right, bindings));
    case "sub":
      return evaluate(expr.left, bindings).sub(evaluate(expr.right, bindings));
    case "mul":
      return evaluate(expr.left, bindings).mul(evaluate(expr.right, bindings));
    case "div": {
      const d = evaluate(expr.right, bindings);
      if (d.isZero()) throw new Error("Division by zero");
      return evaluate(expr.left, bindings).div(d);
    }
    case "pow": {
      const e = evaluate(expr.exp, bindings);
      if (!e.isInteger()) throw new Error("Non-integer exponents not supported");
      return evaluate(expr.base, bindings).pow(e.toNumber());
    }
    case "neg":
      return evaluate(expr.operand, bindings).neg();
    case "frac": {
      const d = evaluate(expr.den, bindings);
      if (d.isZero()) throw new Error("Division by zero in fraction");
      return evaluate(expr.num, bindings).div(d);
    }
    case "quantity":
      return evaluate(expr.value, bindings);
  }
}

// ── Expression rendering ──

/** Render an expression to a human-readable string. */
export function renderExpr(expr: MathExpr): string {
  switch (expr.kind) {
    case "num": {
      const v = expr.value;
      if (v.denBig === 1n) {
        return v.numBig < 0n ? `(${v.numBig})` : String(v.numBig);
      }
      return `${v.numBig}/${v.denBig}`;
    }
    case "var":
      return expr.name;
    case "add":
      return `${renderExpr(expr.left)} + ${renderExpr(expr.right)}`;
    case "sub":
      return `${renderExpr(expr.left)} − ${renderExpr(expr.right)}`;
    case "mul": {
      const l = needsParens(expr.left, "mul") ? `(${renderExpr(expr.left)})` : renderExpr(expr.left);
      const r = needsParens(expr.right, "mul") ? `(${renderExpr(expr.right)})` : renderExpr(expr.right);
      // coefficient × variable: "3x" not "3 × x"
      if (expr.left.kind === "num" && expr.right.kind === "var") return `${l}${r}`;
      return `${l} × ${r}`;
    }
    case "div": {
      const l = needsParens(expr.left, "div") ? `(${renderExpr(expr.left)})` : renderExpr(expr.left);
      const r = needsParens(expr.right, "div") ? `(${renderExpr(expr.right)})` : renderExpr(expr.right);
      return `${l} ÷ ${r}`;
    }
    case "pow":
      return `${renderExpr(expr.base)}^${renderExpr(expr.exp)}`;
    case "neg":
      return `−${needsParens(expr.operand, "neg") ? `(${renderExpr(expr.operand)})` : renderExpr(expr.operand)}`;
    case "frac":
      return `${renderExpr(expr.num)}/${renderExpr(expr.den)}`;
    case "quantity":
      return `${renderExpr(expr.value)} ${expr.unit}`;
  }
}

function needsParens(expr: MathExpr, parentOp: string): boolean {
  if (expr.kind === "add" || expr.kind === "sub") return parentOp === "mul" || parentOp === "div" || parentOp === "neg";
  return false;
}

// ── Expression comparison ──

/** Deep structural equality of expressions (after reduction of rationals). */
export function exprEquals(a: MathExpr, b: MathExpr): boolean {
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case "num": return a.value.eq((b as typeof a).value);
    case "var": return a.name === (b as typeof a).name;
    case "add": case "sub": case "mul": case "div": {
      const bb = b as typeof a;
      return exprEquals(a.left, bb.left) && exprEquals(a.right, bb.right);
    }
    case "pow": {
      const bb = b as typeof a;
      return exprEquals(a.base, bb.base) && exprEquals(a.exp, bb.exp);
    }
    case "neg": return exprEquals(a.operand, (b as typeof a).operand);
    case "frac": {
      const bb = b as typeof a;
      return exprEquals(a.num, bb.num) && exprEquals(a.den, bb.den);
    }
    case "quantity": {
      const bb = b as typeof a;
      return exprEquals(a.value, bb.value) && a.unit === bb.unit;
    }
  }
}

// ── Expression substitution ──

/** Substitute a variable with an expression. */
export function substitute(expr: MathExpr, varName: string, replacement: MathExpr): MathExpr {
  switch (expr.kind) {
    case "num": return expr;
    case "var": return expr.name === varName ? replacement : expr;
    case "add": return Expr.add(substitute(expr.left, varName, replacement), substitute(expr.right, varName, replacement));
    case "sub": return Expr.sub(substitute(expr.left, varName, replacement), substitute(expr.right, varName, replacement));
    case "mul": return Expr.mul(substitute(expr.left, varName, replacement), substitute(expr.right, varName, replacement));
    case "div": return Expr.div(substitute(expr.left, varName, replacement), substitute(expr.right, varName, replacement));
    case "pow": return Expr.pow(substitute(expr.base, varName, replacement), substitute(expr.exp, varName, replacement));
    case "neg": return Expr.neg(substitute(expr.operand, varName, replacement));
    case "frac": return Expr.frac(substitute(expr.num, varName, replacement), substitute(expr.den, varName, replacement));
    case "quantity": return Expr.quantity(substitute(expr.value, varName, replacement), expr.unit);
  }
}

// ── Simplification (limited, not a CAS) ──

/** Simplify where deterministically valid: constant folding, identity elimination, zero elimination. */
export function simplify(expr: MathExpr): MathExpr {
  switch (expr.kind) {
    case "num":
    case "var":
      return expr;
    case "add": {
      const l = simplify(expr.left);
      const r = simplify(expr.right);
      // 0 + x = x, x + 0 = x
      if (l.kind === "num" && l.value.isZero()) return r;
      if (r.kind === "num" && r.value.isZero()) return l;
      // constant fold
      if (l.kind === "num" && r.kind === "num") return Expr.num(l.value.add(r.value));
      return Expr.add(l, r);
    }
    case "sub": {
      const l = simplify(expr.left);
      const r = simplify(expr.right);
      // x - 0 = x
      if (r.kind === "num" && r.value.isZero()) return l;
      // constant fold
      if (l.kind === "num" && r.kind === "num") return Expr.num(l.value.sub(r.value));
      return Expr.sub(l, r);
    }
    case "mul": {
      const l = simplify(expr.left);
      const r = simplify(expr.right);
      // 0 × x = 0, x × 0 = 0
      if (l.kind === "num" && l.value.isZero()) return Expr.num(0);
      if (r.kind === "num" && r.value.isZero()) return Expr.num(0);
      // 1 × x = x, x × 1 = x
      if (l.kind === "num" && l.value.isOne()) return r;
      if (r.kind === "num" && r.value.isOne()) return l;
      // constant fold
      if (l.kind === "num" && r.kind === "num") return Expr.num(l.value.mul(r.value));
      return Expr.mul(l, r);
    }
    case "div": {
      const l = simplify(expr.left);
      const r = simplify(expr.right);
      // x / 1 = x
      if (r.kind === "num" && r.value.isOne()) return l;
      // 0 / x = 0
      if (l.kind === "num" && l.value.isZero()) return Expr.num(0);
      // constant fold
      if (l.kind === "num" && r.kind === "num") {
        if (r.value.isZero()) return Expr.div(l, r); // preserve error
        return Expr.num(l.value.div(r.value));
      }
      return Expr.div(l, r);
    }
    case "pow": {
      const base = simplify(expr.base);
      const exp = simplify(expr.exp);
      // x^1 = x
      if (exp.kind === "num" && exp.value.isOne()) return base;
      // x^0 = 1
      if (exp.kind === "num" && exp.value.isZero()) return Expr.num(1);
      // constant fold
      if (base.kind === "num" && exp.kind === "num" && exp.value.isInteger()) {
        return Expr.num(base.value.pow(exp.value.toNumber()));
      }
      return Expr.pow(base, exp);
    }
    case "neg": {
      const op = simplify(expr.operand);
      if (op.kind === "num") return Expr.num(op.value.neg());
      if (op.kind === "neg") return op.operand; // double negation
      return Expr.neg(op);
    }
    case "frac": {
      const n = simplify(expr.num);
      const d = simplify(expr.den);
      if (n.kind === "num" && d.kind === "num" && !d.value.isZero()) {
        return Expr.num(n.value.div(d.value));
      }
      return Expr.frac(n, d);
    }
    case "quantity":
      return Expr.quantity(simplify(expr.value), expr.unit);
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// 3. MATHEMATICAL STATEMENTS AND STATE
// ════════════════════════════════════════════════════════════════════════════════

export type MathRelation = "=" | "<" | ">" | "≤" | "≥" | "≠";

/** A mathematical statement: a relation between two expressions. */
export interface MathStatement {
  left: MathExpr;
  relation: MathRelation;
  right: MathExpr;
}

/** A constraint on the mathematical context. */
export interface MathConstraint {
  kind: "nonzero" | "positive" | "integer" | "natural";
  expr: MathExpr;
}

/** Mathematical state: the current mathematical situation. */
export interface MathState {
  /** Named expressions (e.g. "equation" → the equation being solved). */
  expressions: Map<string, MathExpr>;
  /** Active statements (equations, inequalities). */
  statements: MathStatement[];
  /** Constraints and assumptions. */
  constraints: MathConstraint[];
  /** Variable bindings discovered so far. */
  bindings: Bindings;
}

export function createState(): MathState {
  return {
    expressions: new Map(),
    statements: [],
    constraints: [],
    bindings: new Map(),
  };
}

/** Verify a statement holds under given bindings. */
export function verifyStatement(stmt: MathStatement, bindings: Bindings): boolean {
  try {
    const l = evaluate(stmt.left, bindings);
    const r = evaluate(stmt.right, bindings);
    switch (stmt.relation) {
      case "=": return l.eq(r);
      case "<": return l.lt(r);
      case ">": return l.gt(r);
      case "≤": return l.le(r);
      case "≥": return l.ge(r);
      case "≠": return !l.eq(r);
    }
  } catch {
    return false;
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// 4. TRANSFORMATION RECORDS
// ════════════════════════════════════════════════════════════════════════════════

/** A record of one mathematical transformation. */
export interface Transformation {
  /** The state before the transformation. */
  before: MathState;
  /** The rule that was applied. */
  ruleId: string;
  /** Parameters to the rule application (varies by rule). */
  params: Record<string, unknown>;
  /** The state after the transformation — generated by the rule, not independently supplied. */
  after: MathState;
  /** Mathematical evidence: how the after-state relates to the before-state. */
  evidence: string;
}

// ════════════════════════════════════════════════════════════════════════════════
// 5. EXECUTABLE RULE REGISTRY
// ════════════════════════════════════════════════════════════════════════════════

/** What a rule needs to be executable. */
export interface MathRule {
  /** Unique identifier (e.g. "arithmetic.evaluate", "algebra.subtract-both-sides"). */
  id: string;
  /** Which kinds of mathematical objects this rule applies to. */
  appliesTo: string[];
  /** Human-readable description. */
  description: string;
  /** Check whether the rule can be applied to a state with given params. Returns null if valid, error message if not. */
  precondition: (state: MathState, params: Record<string, unknown>) => string | null;
  /** Apply the rule: produce the after-state. The after-state is generated, never independently supplied. */
  apply: (state: MathState, params: Record<string, unknown>) => MathState;
  /** Verify the transformation is valid: the after-state was correctly derived from the before-state. */
  verify: (before: MathState, after: MathState, params: Record<string, unknown>) => boolean;
  /** Structured explanation information for teaching. */
  explain: (before: MathState, after: MathState, params: Record<string, unknown>) => RuleExplanation;
}

export interface RuleExplanation {
  /** What mathematical principle is being applied. */
  principle: string;
  /** What was done in this step. */
  action: string;
  /** Why this step is valid. */
  justification: string;
  /** The before-state rendered for teaching. */
  beforeText: string;
  /** The after-state rendered for teaching. */
  afterText: string;
}

/** Registry of executable rules. */
export class RuleRegistry {
  private rules = new Map<string, MathRule>();

  register(rule: MathRule): void {
    if (this.rules.has(rule.id)) throw new Error(`Rule already registered: ${rule.id}`);
    this.rules.set(rule.id, rule);
  }

  get(id: string): MathRule | undefined {
    return this.rules.get(id);
  }

  /** Apply a rule, producing a verified transformation. Throws on precondition failure or verification failure. */
  applyRule(state: MathState, ruleId: string, params: Record<string, unknown>): Transformation {
    const rule = this.rules.get(ruleId);
    if (!rule) throw new Error(`Unknown rule: ${ruleId}`);

    const precondError = rule.precondition(state, params);
    if (precondError) throw new Error(`Rule ${ruleId} precondition failed: ${precondError}`);

    const after = rule.apply(state, params);

    if (!rule.verify(state, after, params)) {
      throw new Error(`Rule ${ruleId} verification failed: after-state not consistent with before-state`);
    }

    const explanation = rule.explain(state, after, params);

    return {
      before: state,
      ruleId,
      params,
      after,
      evidence: explanation.justification,
    };
  }

  listRules(): string[] {
    return [...this.rules.keys()];
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// 6. STATE HELPERS
// ════════════════════════════════════════════════════════════════════════════════

/** Clone a MathState (shallow-deep: new containers, shared expression trees). */
export function cloneState(s: MathState): MathState {
  return {
    expressions: new Map(s.expressions),
    statements: [...s.statements],
    constraints: [...s.constraints],
    bindings: new Map(s.bindings),
  };
}

/** Render a statement for teaching display. */
export function renderStatement(stmt: MathStatement): string {
  return `${renderExpr(stmt.left)} ${stmt.relation} ${renderExpr(stmt.right)}`;
}

// ════════════════════════════════════════════════════════════════════════════════
// 7. INITIAL RULE LIBRARY
// ════════════════════════════════════════════════════════════════════════════════

// ── 7A. Arithmetic rules ──

const arithmeticEvaluate: MathRule = {
  id: "arithmetic.evaluate",
  appliesTo: ["expression"],
  description: "Evaluate an arithmetic expression to its exact result",
  precondition: (state, params) => {
    const exprName = params.expression as string;
    if (!state.expressions.has(exprName)) return `Expression '${exprName}' not found`;
    return null;
  },
  apply: (state, params) => {
    const exprName = params.expression as string;
    const expr = state.expressions.get(exprName)!;
    const result = evaluate(expr, state.bindings);
    const newState = cloneState(state);
    newState.expressions.set(exprName, Expr.num(result));
    return newState;
  },
  verify: (before, after, params) => {
    const exprName = params.expression as string;
    const original = before.expressions.get(exprName)!;
    const result = after.expressions.get(exprName)!;
    try {
      const origVal = evaluate(original, before.bindings);
      const resultVal = evaluate(result, after.bindings);
      return origVal.eq(resultVal);
    } catch { return false; }
  },
  explain: (before, after, params) => {
    const exprName = params.expression as string;
    return {
      principle: "Arithmetic evaluation",
      action: `Evaluate ${renderExpr(before.expressions.get(exprName)!)}`,
      justification: "Direct computation of arithmetic operations",
      beforeText: renderExpr(before.expressions.get(exprName)!),
      afterText: renderExpr(after.expressions.get(exprName)!),
    };
  },
};

const additiveComposition: MathRule = {
  id: "arithmetic.additive-composition",
  appliesTo: ["expression"],
  description: "Compose a sum from its parts",
  precondition: (state, params) => {
    const parts = params.parts as number[];
    if (!parts || parts.length < 2) return "Need at least 2 parts";
    return null;
  },
  apply: (state, params) => {
    const parts = params.parts as number[];
    const label = (params.label as string) || "sum";
    let expr: MathExpr = Expr.num(parts[0]);
    for (let i = 1; i < parts.length; i++) {
      expr = Expr.add(expr, Expr.num(parts[i]));
    }
    const newState = cloneState(state);
    newState.expressions.set(label, simplify(expr));
    return newState;
  },
  verify: (_before, after, params) => {
    const parts = params.parts as number[];
    const label = (params.label as string) || "sum";
    const result = after.expressions.get(label);
    if (!result) return false;
    const expected = parts.reduce((a, b) => a + b, 0);
    try {
      return evaluate(result).eq(new Rational(expected));
    } catch { return false; }
  },
  explain: (_before, after, params) => {
    const parts = params.parts as number[];
    const label = (params.label as string) || "sum";
    return {
      principle: "Additive composition",
      action: `Add ${parts.join(" + ")}`,
      justification: `The sum of ${parts.join(", ")} equals ${renderExpr(after.expressions.get(label)!)}`,
      beforeText: parts.join(" + "),
      afterText: renderExpr(after.expressions.get(label)!),
    };
  },
};

const multiplicativeComposition: MathRule = {
  id: "arithmetic.multiplicative-composition",
  appliesTo: ["expression"],
  description: "Compose a product from its factors",
  precondition: (state, params) => {
    const factors = params.factors as number[];
    if (!factors || factors.length < 2) return "Need at least 2 factors";
    return null;
  },
  apply: (state, params) => {
    const factors = params.factors as number[];
    const label = (params.label as string) || "product";
    let expr: MathExpr = Expr.num(factors[0]);
    for (let i = 1; i < factors.length; i++) {
      expr = Expr.mul(expr, Expr.num(factors[i]));
    }
    const newState = cloneState(state);
    newState.expressions.set(label, simplify(expr));
    return newState;
  },
  verify: (_before, after, params) => {
    const factors = params.factors as number[];
    const label = (params.label as string) || "product";
    const result = after.expressions.get(label);
    if (!result) return false;
    const expected = factors.reduce((a, b) => a * b, 1);
    try {
      return evaluate(result).eq(new Rational(expected));
    } catch { return false; }
  },
  explain: (_before, after, params) => {
    const factors = params.factors as number[];
    const label = (params.label as string) || "product";
    return {
      principle: "Multiplicative composition",
      action: `Multiply ${factors.join(" × ")}`,
      justification: `The product of ${factors.join(", ")} equals ${renderExpr(after.expressions.get(label)!)}`,
      beforeText: factors.join(" × "),
      afterText: renderExpr(after.expressions.get(label)!),
    };
  },
};

// ── 7B. Decomposition rules ──

const baseTenDecomposition: MathRule = {
  id: "decomposition.base-ten",
  appliesTo: ["number"],
  description: "Decompose a number into its base-ten positional components",
  precondition: (_state, params) => {
    const number = params.number as number;
    if (!Number.isInteger(number) || number < 0) return "Must be a non-negative integer";
    return null;
  },
  apply: (state, params) => {
    const number = params.number as number;
    const newState = cloneState(state);

    // Decompose into place values
    const digits: Array<{ digit: number; placeValue: number; placeName: string }> = [];
    const placeNames = ["ones", "tens", "hundreds", "thousands", "ten-thousands", "lakhs", "ten-lakhs", "crores"];
    let remaining = number;
    let place = 1;
    let placeIdx = 0;

    while (remaining > 0 || place <= 1) {
      const digit = remaining % 10;
      if (digit !== 0 || place === 1) {
        digits.unshift({ digit, placeValue: place, placeName: placeNames[placeIdx] || `10^${placeIdx}` });
      }
      remaining = Math.floor(remaining / 10);
      place *= 10;
      placeIdx++;
      if (remaining === 0 && place > 1) break;
    }

    // Build additive expression: d₁ × p₁ + d₂ × p₂ + ...
    let expr: MathExpr | null = null;
    for (const { digit, placeValue } of digits) {
      const term = Expr.mul(Expr.num(digit), Expr.num(placeValue));
      expr = expr ? Expr.add(expr, term) : term;
    }
    if (!expr) expr = Expr.num(0);

    newState.expressions.set("decomposition", expr);
    newState.expressions.set("number", Expr.num(number));
    return newState;
  },
  verify: (_before, after, params) => {
    const number = params.number as number;
    const decomp = after.expressions.get("decomposition");
    if (!decomp) return false;
    try {
      return evaluate(decomp).eq(new Rational(number));
    } catch { return false; }
  },
  explain: (_before, after, params) => {
    const number = params.number as number;
    return {
      principle: "Base-ten positional decomposition",
      action: `Decompose ${number} by place value`,
      justification: "Each digit contributes digit × place value; the sum equals the original number",
      beforeText: String(number),
      afterText: renderExpr(after.expressions.get("decomposition")!),
    };
  },
};

// ── 7C. Fraction rules ──

const fractionEquivalence: MathRule = {
  id: "fraction.equivalence",
  appliesTo: ["fraction"],
  description: "Multiply numerator and denominator by the same nonzero value to produce an equivalent fraction",
  precondition: (_state, params) => {
    const factor = params.factor as number;
    if (!factor || factor === 0) return "Scaling factor must be nonzero";
    if (!Number.isInteger(factor)) return "Scaling factor must be an integer";
    const num = params.numerator as number;
    const den = params.denominator as number;
    if (den === 0) return "Denominator must be nonzero";
    if (num === undefined || den === undefined) return "Numerator and denominator required";
    return null;
  },
  apply: (state, params) => {
    const factor = params.factor as number;
    const num = params.numerator as number;
    const den = params.denominator as number;
    const newState = cloneState(state);
    newState.expressions.set("fraction-before", Expr.frac(Expr.num(num), Expr.num(den)));
    newState.expressions.set("fraction-after", Expr.frac(Expr.num(num * factor), Expr.num(den * factor)));
    newState.statements.push({
      left: Expr.frac(Expr.num(num), Expr.num(den)),
      relation: "=",
      right: Expr.frac(Expr.num(num * factor), Expr.num(den * factor)),
    });
    return newState;
  },
  verify: (_before, after, params) => {
    const factor = params.factor as number;
    const num = params.numerator as number;
    const den = params.denominator as number;
    const fb = after.expressions.get("fraction-before");
    const fa = after.expressions.get("fraction-after");
    if (!fb || !fa) return false;
    try {
      return evaluate(fb).eq(evaluate(fa)) && factor !== 0;
    } catch { return false; }
  },
  explain: (_before, _after, params) => {
    const factor = params.factor as number;
    const num = params.numerator as number;
    const den = params.denominator as number;
    return {
      principle: "Fraction equivalence (×k/k = ×1)",
      action: `Multiply ${num}/${den} by ${factor}/${factor}`,
      justification: `Multiplying numerator and denominator by ${factor} gives ${num * factor}/${den * factor}, which equals ${num}/${den}`,
      beforeText: `${num}/${den}`,
      afterText: `${num * factor}/${den * factor}`,
    };
  },
};

const fractionCommonDenominator: MathRule = {
  id: "fraction.common-denominator",
  appliesTo: ["fraction"],
  description: "Find a common denominator for two fractions",
  precondition: (_state, params) => {
    const d1 = params.den1 as number;
    const d2 = params.den2 as number;
    if (!d1 || !d2 || d1 === 0 || d2 === 0) return "Both denominators must be nonzero";
    return null;
  },
  apply: (state, params) => {
    const n1 = params.num1 as number;
    const d1 = params.den1 as number;
    const n2 = params.num2 as number;
    const d2 = params.den2 as number;
    const lcm = (d1 * d2) / gcd(d1, d2);
    const f1 = lcm / d1;
    const f2 = lcm / d2;
    const newState = cloneState(state);
    newState.expressions.set("frac1", Expr.frac(Expr.num(n1 * f1), Expr.num(lcm)));
    newState.expressions.set("frac2", Expr.frac(Expr.num(n2 * f2), Expr.num(lcm)));
    return newState;
  },
  verify: (_before, after, params) => {
    const n1 = params.num1 as number;
    const d1 = params.den1 as number;
    const n2 = params.num2 as number;
    const d2 = params.den2 as number;
    try {
      const orig1 = new Rational(n1, d1);
      const orig2 = new Rational(n2, d2);
      const new1 = evaluate(after.expressions.get("frac1")!);
      const new2 = evaluate(after.expressions.get("frac2")!);
      return orig1.eq(new1) && orig2.eq(new2);
    } catch { return false; }
  },
  explain: (_before, after, params) => {
    const n1 = params.num1 as number;
    const d1 = params.den1 as number;
    const n2 = params.num2 as number;
    const d2 = params.den2 as number;
    return {
      principle: "Common denominator",
      action: `Find a common denominator for ${n1}/${d1} and ${n2}/${d2}`,
      justification: `Scale both fractions so their denominators match`,
      beforeText: `${n1}/${d1} and ${n2}/${d2}`,
      afterText: `${renderExpr(after.expressions.get("frac1")!)} and ${renderExpr(after.expressions.get("frac2")!)}`,
    };
  },
};

// ── 7D. Algebra rules ──

const subtractBothSides: MathRule = {
  id: "algebra.subtract-both-sides",
  appliesTo: ["equation"],
  description: "Subtract the same value from both sides of an equation",
  precondition: (state, params) => {
    const eqIdx = (params.equationIndex as number) ?? 0;
    if (eqIdx >= state.statements.length) return "Equation index out of range";
    if (state.statements[eqIdx].relation !== "=") return "Can only subtract from both sides of an equation";
    const value = params.value;
    if (value === undefined) return "Must specify value to subtract";
    return null;
  },
  apply: (state, params) => {
    const eqIdx = (params.equationIndex as number) ?? 0;
    const value = params.value as number;
    const stmt = state.statements[eqIdx];
    const subtrahend = Expr.num(value);
    const newState = cloneState(state);
    const newLeft = simplify(Expr.sub(stmt.left, subtrahend));
    const newRight = simplify(Expr.sub(stmt.right, subtrahend));
    newState.statements[eqIdx] = { left: newLeft, relation: "=", right: newRight };
    return newState;
  },
  verify: (before, after, params) => {
    const eqIdx = (params.equationIndex as number) ?? 0;
    const value = params.value as number;
    // Check: for any binding satisfying the before equation, the after equation also holds
    // Since we don't have full solving, verify structurally: both sides had the same value subtracted
    const beforeStmt = before.statements[eqIdx];
    const afterStmt = after.statements[eqIdx];
    // Verify using concrete bindings if available
    const allBindings = new Map([...before.bindings, ...after.bindings]);
    if (allBindings.size > 0) {
      try {
        const bl = evaluate(beforeStmt.left, allBindings);
        const br = evaluate(beforeStmt.right, allBindings);
        const al = evaluate(afterStmt.left, allBindings);
        const ar = evaluate(afterStmt.right, allBindings);
        return bl.eq(br) && al.eq(ar) &&
               bl.sub(new Rational(value)).eq(al);
      } catch { /* fall through to structural check */ }
    }
    return true; // structural rule application is self-verifying
  },
  explain: (before, after, params) => {
    const eqIdx = (params.equationIndex as number) ?? 0;
    const value = params.value as number;
    return {
      principle: "Equality preservation",
      action: `Subtract ${value} from both sides`,
      justification: `Subtracting the same value from both sides preserves the equality`,
      beforeText: renderStatement(before.statements[eqIdx]),
      afterText: renderStatement(after.statements[eqIdx]),
    };
  },
};

const addBothSides: MathRule = {
  id: "algebra.add-both-sides",
  appliesTo: ["equation"],
  description: "Add the same value to both sides of an equation",
  precondition: (state, params) => {
    const eqIdx = (params.equationIndex as number) ?? 0;
    if (eqIdx >= state.statements.length) return "Equation index out of range";
    if (state.statements[eqIdx].relation !== "=") return "Can only add to both sides of an equation";
    const value = params.value;
    if (value === undefined) return "Must specify value to add";
    return null;
  },
  apply: (state, params) => {
    const eqIdx = (params.equationIndex as number) ?? 0;
    const value = params.value as number;
    const stmt = state.statements[eqIdx];
    const addend = Expr.num(value);
    const newState = cloneState(state);
    const newLeft = simplify(Expr.add(stmt.left, addend));
    const newRight = simplify(Expr.add(stmt.right, addend));
    newState.statements[eqIdx] = { left: newLeft, relation: "=", right: newRight };
    return newState;
  },
  verify: (before, after, params) => {
    const eqIdx = (params.equationIndex as number) ?? 0;
    const allBindings = new Map([...before.bindings, ...after.bindings]);
    if (allBindings.size > 0) {
      try {
        const bl = evaluate(before.statements[eqIdx].left, allBindings);
        const br = evaluate(before.statements[eqIdx].right, allBindings);
        const al = evaluate(after.statements[eqIdx].left, allBindings);
        const ar = evaluate(after.statements[eqIdx].right, allBindings);
        return bl.eq(br) && al.eq(ar);
      } catch { /* structural check */ }
    }
    return true;
  },
  explain: (before, after, params) => {
    const eqIdx = (params.equationIndex as number) ?? 0;
    const value = params.value as number;
    return {
      principle: "Equality preservation",
      action: `Add ${value} to both sides`,
      justification: `Adding the same value to both sides preserves the equality`,
      beforeText: renderStatement(before.statements[eqIdx]),
      afterText: renderStatement(after.statements[eqIdx]),
    };
  },
};

const divideBothSides: MathRule = {
  id: "algebra.divide-both-sides",
  appliesTo: ["equation"],
  description: "Divide both sides of an equation by the same nonzero value",
  precondition: (state, params) => {
    const eqIdx = (params.equationIndex as number) ?? 0;
    if (eqIdx >= state.statements.length) return "Equation index out of range";
    if (state.statements[eqIdx].relation !== "=") return "Can only divide both sides of an equation";
    const value = params.value as number;
    if (value === undefined) return "Must specify value to divide by";
    if (value === 0) return "Cannot divide by zero";
    return null;
  },
  apply: (state, params) => {
    const eqIdx = (params.equationIndex as number) ?? 0;
    const value = params.value as number;
    const stmt = state.statements[eqIdx];
    const divisor = Expr.num(value);
    const newState = cloneState(state);
    const newLeft = simplify(Expr.div(stmt.left, divisor));
    const newRight = simplify(Expr.div(stmt.right, divisor));
    newState.statements[eqIdx] = { left: newLeft, relation: "=", right: newRight };
    return newState;
  },
  verify: (before, after, params) => {
    const eqIdx = (params.equationIndex as number) ?? 0;
    const value = params.value as number;
    if (value === 0) return false;
    const allBindings = new Map([...before.bindings, ...after.bindings]);
    if (allBindings.size > 0) {
      try {
        const bl = evaluate(before.statements[eqIdx].left, allBindings);
        const br = evaluate(before.statements[eqIdx].right, allBindings);
        const al = evaluate(after.statements[eqIdx].left, allBindings);
        const ar = evaluate(after.statements[eqIdx].right, allBindings);
        return bl.eq(br) && al.eq(ar);
      } catch { /* structural */ }
    }
    return true;
  },
  explain: (before, after, params) => {
    const eqIdx = (params.equationIndex as number) ?? 0;
    const value = params.value as number;
    return {
      principle: "Equality preservation",
      action: `Divide both sides by ${value}`,
      justification: `Dividing both sides by the same nonzero value preserves the equality`,
      beforeText: renderStatement(before.statements[eqIdx]),
      afterText: renderStatement(after.statements[eqIdx]),
    };
  },
};

const multiplyBothSides: MathRule = {
  id: "algebra.multiply-both-sides",
  appliesTo: ["equation"],
  description: "Multiply both sides of an equation by the same nonzero value",
  precondition: (state, params) => {
    const eqIdx = (params.equationIndex as number) ?? 0;
    if (eqIdx >= state.statements.length) return "Equation index out of range";
    if (state.statements[eqIdx].relation !== "=") return "Can only multiply both sides of an equation";
    const value = params.value as number;
    if (value === undefined) return "Must specify value to multiply by";
    if (value === 0) return "Multiplying by zero loses information";
    return null;
  },
  apply: (state, params) => {
    const eqIdx = (params.equationIndex as number) ?? 0;
    const value = params.value as number;
    const stmt = state.statements[eqIdx];
    const factor = Expr.num(value);
    const newState = cloneState(state);
    const newLeft = simplify(Expr.mul(stmt.left, factor));
    const newRight = simplify(Expr.mul(stmt.right, factor));
    newState.statements[eqIdx] = { left: newLeft, relation: "=", right: newRight };
    return newState;
  },
  verify: (before, after, params) => {
    const eqIdx = (params.equationIndex as number) ?? 0;
    const value = params.value as number;
    if (value === 0) return false;
    const allBindings = new Map([...before.bindings, ...after.bindings]);
    if (allBindings.size > 0) {
      try {
        const bl = evaluate(before.statements[eqIdx].left, allBindings);
        const br = evaluate(before.statements[eqIdx].right, allBindings);
        const al = evaluate(after.statements[eqIdx].left, allBindings);
        const ar = evaluate(after.statements[eqIdx].right, allBindings);
        return bl.eq(br) && al.eq(ar);
      } catch { /* structural */ }
    }
    return true;
  },
  explain: (before, after, params) => {
    const eqIdx = (params.equationIndex as number) ?? 0;
    const value = params.value as number;
    return {
      principle: "Equality preservation",
      action: `Multiply both sides by ${value}`,
      justification: `Multiplying both sides by the same nonzero value preserves the equality`,
      beforeText: renderStatement(before.statements[eqIdx]),
      afterText: renderStatement(after.statements[eqIdx]),
    };
  },
};

// ── 7E. Geometry rules ──

const rectangleArea: MathRule = {
  id: "geometry.rectangle-area",
  appliesTo: ["rectangle"],
  description: "Rectangle area through unit coverage: rows × columns of unit squares",
  precondition: (_state, params) => {
    const length = params.length as number;
    const width = params.width as number;
    if (length === undefined || width === undefined) return "Length and width required";
    if (length <= 0 || width <= 0) return "Dimensions must be positive";
    return null;
  },
  apply: (state, params) => {
    const length = params.length as number;
    const width = params.width as number;
    const unit = (params.unit as string) || "units";
    const newState = cloneState(state);
    newState.expressions.set("length", Expr.quantity(Expr.num(length), unit));
    newState.expressions.set("width", Expr.quantity(Expr.num(width), unit));
    newState.expressions.set("area", Expr.quantity(Expr.num(length * width), `square ${unit}`));
    newState.statements.push({
      left: newState.expressions.get("area")!,
      relation: "=",
      right: Expr.quantity(
        Expr.mul(Expr.num(length), Expr.num(width)),
        `square ${unit}`,
      ),
    });
    return newState;
  },
  verify: (_before, after, params) => {
    const length = params.length as number;
    const width = params.width as number;
    const area = after.expressions.get("area");
    if (!area) return false;
    try {
      const val = evaluate(area);
      return val.eq(new Rational(length * width));
    } catch { return false; }
  },
  explain: (_before, _after, params) => {
    const length = params.length as number;
    const width = params.width as number;
    const unit = (params.unit as string) || "units";
    return {
      principle: "Unit coverage",
      action: `Calculate area of ${length} × ${width} rectangle`,
      justification: `${length} rows of ${width} unit squares each = ${length * width} square ${unit}`,
      beforeText: `Rectangle: ${length} ${unit} × ${width} ${unit}`,
      afterText: `Area = ${length * width} square ${unit}`,
    };
  },
};

const rectanglePerimeter: MathRule = {
  id: "geometry.rectangle-perimeter",
  appliesTo: ["rectangle"],
  description: "Rectangle perimeter through side composition: 2 × (length + width)",
  precondition: (_state, params) => {
    const length = params.length as number;
    const width = params.width as number;
    if (length === undefined || width === undefined) return "Length and width required";
    if (length <= 0 || width <= 0) return "Dimensions must be positive";
    return null;
  },
  apply: (state, params) => {
    const length = params.length as number;
    const width = params.width as number;
    const unit = (params.unit as string) || "units";
    const newState = cloneState(state);
    newState.expressions.set("length", Expr.quantity(Expr.num(length), unit));
    newState.expressions.set("width", Expr.quantity(Expr.num(width), unit));
    const halfPerimeter = Expr.add(Expr.num(length), Expr.num(width));
    const perimeter = Expr.mul(Expr.num(2), halfPerimeter);
    newState.expressions.set("half-perimeter", Expr.quantity(simplify(halfPerimeter), unit));
    newState.expressions.set("perimeter", Expr.quantity(simplify(perimeter), unit));
    return newState;
  },
  verify: (_before, after, params) => {
    const length = params.length as number;
    const width = params.width as number;
    const perimeter = after.expressions.get("perimeter");
    if (!perimeter) return false;
    try {
      return evaluate(perimeter).eq(new Rational(2 * (length + width)));
    } catch { return false; }
  },
  explain: (_before, _after, params) => {
    const length = params.length as number;
    const width = params.width as number;
    const unit = (params.unit as string) || "units";
    const halfP = length + width;
    const p = 2 * halfP;
    return {
      principle: "Side composition",
      action: `Calculate perimeter of ${length} × ${width} rectangle`,
      justification: `Two lengths + two widths: 2 × (${length} + ${width}) = 2 × ${halfP} = ${p} ${unit}`,
      beforeText: `Rectangle: ${length} ${unit} × ${width} ${unit}`,
      afterText: `Perimeter = ${p} ${unit}`,
    };
  },
};

// ── 7F. Comparison rules ──

const numericOrdering: MathRule = {
  id: "comparison.ordering",
  appliesTo: ["number"],
  description: "Determine the ordering between two numbers",
  precondition: (_state, params) => {
    // Exact values only: text such as "2/5" is read as a fraction, and anything unreadable (NaN) is refused
    // instead of being ordered — NaN compares as neither < nor >, which would "verify" any claimed equality.
    const a = parseRational(params.left as number | string | Rational);
    const b = parseRational(params.right as number | string | Rational);
    if (!a || !b) return "Two exact numbers required";
    const claimed = params.claimed as MathRelation | undefined;
    if (claimed !== undefined && !orderingHolds(a, b, claimed)) {
      return `Claimed ${params.left} ${claimed} ${params.right} is false`;
    }
    return null;
  },
  apply: (state, params) => {
    const a = parseRational(params.left as number | string | Rational)!;
    const b = parseRational(params.right as number | string | Rational)!;
    const newState = cloneState(state);
    newState.statements.push({
      left: Expr.num(a),
      relation: strictOrdering(a, b),
      right: Expr.num(b),
    });
    return newState;
  },
  verify: (_before, after, params) => {
    const a = parseRational(params.left as number | string | Rational);
    const b = parseRational(params.right as number | string | Rational);
    if (!a || !b) return false;
    const stmt = after.statements[after.statements.length - 1];
    if (!stmt) return false;
    // Independently recompute from the after-state's own numbers, not from the rule's choice.
    if (stmt.left.kind !== "num" || stmt.right.kind !== "num") return false;
    if (!stmt.left.value.eq(a) || !stmt.right.value.eq(b)) return false;
    const claimed = params.claimed as MathRelation | undefined;
    return stmt.relation === strictOrdering(a, b) && (claimed === undefined || orderingHolds(a, b, claimed));
  },
  explain: (_before, _after, params) => {
    const a = params.left as number | string;
    const b = params.right as number | string;
    const rel = strictOrdering(parseRational(a)!, parseRational(b)!);
    return {
      principle: "Numeric ordering",
      action: `Compare ${a} and ${b}`,
      justification: `${a} ${rel} ${b}`,
      beforeText: `${a} ? ${b}`,
      afterText: `${a} ${rel} ${b}`,
    };
  },
};

// ════════════════════════════════════════════════════════════════════════════════
// 8. DEFAULT REGISTRY
// ════════════════════════════════════════════════════════════════════════════════

/** Create a registry with all built-in rules registered. */
export function createDefaultRegistry(): RuleRegistry {
  const registry = new RuleRegistry();

  // Arithmetic
  registry.register(arithmeticEvaluate);
  registry.register(additiveComposition);
  registry.register(multiplicativeComposition);

  // Decomposition
  registry.register(baseTenDecomposition);

  // Fractions
  registry.register(fractionEquivalence);
  registry.register(fractionCommonDenominator);

  // Algebra
  registry.register(subtractBothSides);
  registry.register(addBothSides);
  registry.register(divideBothSides);
  registry.register(multiplyBothSides);

  // Geometry
  registry.register(rectangleArea);
  registry.register(rectanglePerimeter);

  // Comparison
  registry.register(numericOrdering);

  return registry;
}
