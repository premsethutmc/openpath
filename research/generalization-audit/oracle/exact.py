"""Isolated SymPy transition verifier (prototype).

verify_transition(prev, next, ctx) -> TransitionResult with verdict in
  equivalent | implication | invalid | unresolved

Soundness rules (enforced in code, see SOUNDNESS comments):
  * equivalence is established only by exact symbolic reasoning (zero test of a difference, equality of exactly computed
    solution sets, or an exact constant ratio between equations) -- never by agreement at sample points;
  * invalid is established only by an exact counterexample: a point where the previous statement holds/is defined and
    the next fails/differs, re-checked by exact substitution with certified-precision evaluation;
  * anything else is unresolved -- failure to simplify is never evidence of invalidity;
  * natural-domain conditions are recorded by the parser before SymPy auto-simplification, so x/x or (x^2-1)/(x-1)
    keep their excluded points; assumptions are never added silently.
"""
from __future__ import annotations
import signal
import time
from dataclasses import dataclass, field, asdict
import sympy as sp
from sympy.sets.conditionset import ConditionSet
from sympy.sets.fancysets import ImageSet
from safe_parse import Ctx, Statement, Unreadable, Ambiguous, parse_statement

R = sp.S.Reals


class Timeout(Exception):
    pass


def _alarm(_s, _f):
    raise Timeout()


def limited(fn, seconds=2.0):
    """Run fn with a CPU-time limit (ITIMER_PROF: independent of machine load, so verdicts do not change with
    concurrency). Worker-process main thread only. Returns None on timeout or SymPy error. The supervising client
    additionally enforces a wall-clock limit per request."""
    old = signal.signal(signal.SIGPROF, _alarm)
    signal.setitimer(signal.ITIMER_PROF, seconds)
    try:
        return fn()
    except Timeout:
        return None
    except (RecursionError, MemoryError):
        return None
    except Exception:  # noqa: BLE001 - a SymPy failure is "could not decide", never a verdict
        return None
    finally:
        signal.setitimer(signal.ITIMER_PROF, 0)
        signal.signal(signal.SIGPROF, old)


@dataclass
class TransitionResult:
    verdict: str                      # equivalent | implication | invalid | unresolved
    mode: str = ""                    # sets | expression | equation-ratio | closed
    reason: str = ""
    counterexample: dict | None = None
    extraneous: str | None = None     # candidates admitted by next but not by prev (implication)
    lost: str | None = None           # solutions of prev missing from next (invalid)
    required_restrictions: list = field(default_factory=list)
    evidence: list = field(default_factory=list)
    ms: float = 0.0

    def to_dict(self):
        return asdict(self)


# ------------------------------------------------------------------ exact numeric helpers
def certain_sign(v):
    """+1 / -1 / 0 / None for a closed expression; 0 only from exact simplification; signs from strict evalf."""
    if v is None:
        return None
    try:
        v = sp.sympify(v)
    except Exception:  # noqa: BLE001
        return None
    if v.has(sp.zoo, sp.nan, sp.oo, -sp.oo):
        return None
    if v.free_symbols:
        return None
    z = limited(lambda: sp.simplify(v), 1.5)
    if z is not None and z == 0:
        return 0
    try:
        n = limited(lambda: v.evalf(40, strict=True), 1.5)
    except Exception:  # noqa: BLE001
        n = None
    if n is None:
        return None
    if not n.is_real:
        if n.is_number and abs(sp.im(n)) > 1e-30:
            return "complex"
        return None
    if abs(n) < 1e-30:
        return None  # numerically tiny but not proven zero: undecided
    return 1 if n > 0 else -1


def value_at(e, var_vals: dict):
    """Exact value of e at a point, or None if undefined (zoo/nan/non-real)."""
    v = limited(lambda: e.subs(var_vals), 1.0)
    if v is None or v.has(sp.zoo, sp.nan) or v.free_symbols:
        return None
    s = certain_sign(sp.im(v)) if not v.is_real else 0
    if s not in (0,):
        return None
    return v


def conds_hold(conds, var_vals):
    """True if every natural-domain condition holds exactly at the point, False if one certainly fails, else None."""
    for kind, e in conds:
        v = value_at(e, var_vals)
        if v is None:
            return False
        s = certain_sign(v)
        if s is None or s == "complex":
            return None
        if kind == "ne0" and s == 0:
            return False
        if kind == "ge0" and s == -1:
            return False
        if kind == "gt0" and s != 1:
            return False
    return True


REL_OPS = {"=": lambda s: s == 0, "!=": lambda s: s != 0, "<": lambda s: s == -1, ">": lambda s: s == 1,
           "<=": lambda s: s in (-1, 0), ">=": lambda s: s in (1, 0)}


def truth_at(st: Statement, var_vals) -> bool | None:
    """Exact truth value of a statement at a point (False outside its natural domain)."""
    if st.kind == "or":
        vals = [truth_at(p, var_vals) for p in st.parts]
        if any(v is True for v in vals):
            return True
        return False if all(v is False for v in vals) else None
    if st.kind == "and":
        vals = [truth_at(p, var_vals) for p in st.parts]
        if any(v is False for v in vals):
            return False
        return True if all(v is True for v in vals) else None
    if st.kind != "rel":
        return None
    for i, op in enumerate(st.ops):
        a, b = value_at(st.exprs[i], var_vals), value_at(st.exprs[i + 1], var_vals)
        if a is None or b is None:
            return False
        s = certain_sign(a - b)
        if s is None or s == "complex":
            return None
        if not REL_OPS[op](s):
            return False
    return True


def expr_conds(e):
    """Natural-domain conditions read off an already-built SymPy expression (complements the parse-time record)."""
    out = []
    for a in sp.preorder_traversal(e):
        if isinstance(a, sp.Pow):
            b, p = a.args
            if p.is_number and p.is_negative:
                out.append(("ne0", b))
            if p.is_Rational and not p.is_Integer and p.q % 2 == 0:
                out.append(("ge0", b))
        elif isinstance(a, sp.log):
            out.append(("gt0", a.args[0]))
        elif isinstance(a, (sp.tan, sp.sec)):
            out.append(("ne0", sp.cos(a.args[0])))
        elif isinstance(a, (sp.cot, sp.csc)):
            out.append(("ne0", sp.sin(a.args[0])))
    return out


# ------------------------------------------------------------------ sets
def bad_set(s):
    return s is None or s.has(ConditionSet) or s.has(ImageSet) or isinstance(s, (ConditionSet, ImageSet))


def cond_set(conds, x, base):
    """Natural domain (subset of base) from recorded parse conditions; None if not computable."""
    D = base
    for kind, e in conds:
        if x not in e.free_symbols:
            continue
        rel = {"ne0": sp.Ne(e, 0), "ge0": e >= 0, "gt0": e > 0}.get(kind)
        if rel is None:
            return None
        s = limited(lambda: sp.solveset(rel, x, base), 2.5)
        if bad_set(s):
            return None
        D = limited(lambda: sp.Intersection(D, s), 1.0)
        if D is None:
            return None
    return D


def relation_set(a, op, b, x, D):
    rel = {"=": sp.Eq(a, b), "!=": sp.Ne(a, b), "<": sp.Lt(a, b), ">": sp.Gt(a, b), "<=": sp.Le(a, b), ">=": sp.Ge(a, b)}[op]
    if rel is sp.true:
        return D
    if rel is sp.false:
        return sp.S.EmptySet
    s = limited(lambda: sp.solveset(rel, x, D), 3.0)
    if bad_set(s):
        return None
    TRIG = (sp.sin, sp.cos, sp.tan, sp.sec, sp.csc, sp.cot)
    if (a - b).has(*TRIG):
        try:
            bounded = D.inf.is_finite and D.sup.is_finite
        except AttributeError:
            bounded = False
        if not bounded:
            return None  # periodic solution sets over unbounded domains: SymPy returns truncated sets; refuse
        if not _sample_membership_agrees(rel, x, D, s):
            return None
    if op == "=" and (a - b).has(sp.sin, sp.cos, sp.tan, sp.sec, sp.csc, sp.cot, sp.exp, sp.log) and isinstance(s, sp.FiniteSet):
        if not _numeric_roots_covered(a - b, x, D, s):
            return None  # SymPy's solveset is known to drop roots of some trigonometric equations: refuse to certify
    return s


def _sample_membership_agrees(rel, x, D, S, n=600):
    """Refuse certification when the computed set disagrees with the relation's numeric truth at sample points of D
    (points within 1e-6 of a boundary are skipped)."""
    import mpmath
    lo, hi = float(D.inf), float(D.sup)
    f = sp.lambdify(x, rel.lhs - rel.rhs, "mpmath")
    for k in range(1, n):
        t = lo + (hi - lo) * k / n
        try:
            v = f(t)
        except Exception:  # noqa: BLE001
            continue
        if abs(mpmath.im(v)) > 1e-12 or abs(mpmath.re(v)) < 1e-6:
            continue
        v = float(mpmath.re(v))
        truth = {"Unequality": v != 0, "StrictLessThan": v < 0, "StrictGreaterThan": v > 0, "LessThan": v <= 0, "GreaterThan": v >= 0, "Equality": False}.get(type(rel).__name__)
        if truth is None:
            continue
        inD = D.contains(sp.Float(t)) is sp.true
        if not inD:
            continue
        member = S.contains(sp.Float(t))
        if member in (sp.true, sp.false) and bool(member) != truth:
            return False
    return True


def _numeric_roots_covered(f, x, D, S):
    """Corroboration of a finite transcendental solution set on a bounded domain: every approximate root found by
    dense sampling must be close to a member of S. Used only to REFUSE certification, never to establish a set."""
    import mpmath
    try:
        lo, hi = float(D.inf), float(D.sup)
    except (TypeError, ValueError, AttributeError):
        return True  # unbounded: not checked here
    if not (mpmath.isfinite(lo) and mpmath.isfinite(hi)):
        return True
    g = sp.lambdify(x, f, "mpmath")
    n = 4000
    xs = [lo + (hi - lo) * k / n for k in range(n + 1)]
    vals = []
    for t in xs:
        try:
            v = g(t)
            vals.append(float(mpmath.re(v)) if abs(mpmath.im(v)) < 1e-12 else None)
        except Exception:  # noqa: BLE001
            vals.append(None)
    sols = [float(v) for v in S]
    approx = []
    for k in range(n):
        a, b = vals[k], vals[k + 1]
        if a is None or b is None:
            continue
        if a == 0 or (a * b < 0 and min(abs(a), abs(b)) < 0.1):  # a sign change across a pole is not a root
            approx.append(xs[k])
        elif 0 < k and vals[k - 1] is not None and abs(a) < 1e-6 and abs(a) <= abs(vals[k - 1]) and abs(a) <= abs(b):
            approx.append(xs[k])
    tol = 2 * (hi - lo) / n + 1e-9
    for r in approx:
        if lo + tol < r < hi - tol and not any(abs(r - z) <= tol for z in sols):
            return False
    return True


def statement_set(st: Statement, x, D):
    """{x in D : st} intersected with st's natural domain; None if not exactly computable."""
    if st.kind == "or":
        parts = [statement_set(p, x, D) for p in st.parts]
        return None if any(p is None for p in parts) else limited(lambda: sp.Union(*parts), 1.0)
    if st.kind == "and":
        parts = [statement_set(p, x, D) for p in st.parts]
        return None if any(p is None for p in parts) else limited(lambda: sp.Intersection(*parts), 1.0)
    if st.kind != "rel":
        return None
    S = cond_set(st.conds, x, D)
    if S is None:
        return None
    for i, op in enumerate(st.ops):
        part = relation_set(st.exprs[i], op, st.exprs[i + 1], x, S)
        if part is None:
            return None
        S = part
    return S


def is_empty(s):
    if s is None:
        return None
    e = limited(lambda: s.is_empty, 1.5)
    if e is None:
        z = limited(lambda: sp.simplify(s), 1.5)
        e = None if z is None else (True if z == sp.S.EmptySet else None)
    return e


def diff_set(a, b):
    return limited(lambda: sp.Complement(a, b), 1.5)


def pick_point(S):
    """A point of S (exact), preferring simple rationals."""
    if S is None:
        return None
    if isinstance(S, sp.FiniteSet):
        els = sorted(S.args, key=lambda v: (not v.is_Rational, sp.count_ops(v)))
        return els[0] if els else None
    if isinstance(S, sp.Interval):
        a, b = S.start, S.end
        if a.is_finite and b.is_finite:
            return (a + b) / 2
        if a.is_finite:
            return sp.floor(a) + 1
        if b.is_finite:
            return sp.ceiling(b) - 1
        return sp.Integer(0)
    if isinstance(S, sp.Union):
        for arg in S.args:
            p = pick_point(arg)
            if p is not None:
                return p
    if isinstance(S, sp.Complement):
        base, ex = S.args
        if isinstance(base, (sp.Interval,)) or base == R:
            for c in [0, 1, -1, 2, -2, 3, -3, sp.Rational(1, 2), 5, -5, 7, 10]:
                c = sp.Integer(c) if isinstance(c, int) else c
                if limited(lambda: S.contains(c), 1.0) is sp.true:
                    return c
    for c in [0, 1, -1, 2, -2, 3, sp.Rational(1, 2), -3, 5, 10]:
        c = sp.sympify(c)
        if limited(lambda: S.contains(c), 1.0) is sp.true:
            return c
    return None


# ------------------------------------------------------------------ expressions
def zero_test(d, x=None):
    """True only if d simplifies exactly to 0 (generic identity). Never numeric."""
    if d == 0:
        return True
    tries = [sp.cancel, lambda e: sp.together(sp.expand(e)), sp.simplify, sp.trigsimp, sp.radsimp,
             lambda e: sp.simplify(sp.expand_log(e)), lambda e: sp.simplify(e.rewrite(sp.exp))]
    for f in tries:
        r = limited(lambda: f(d), 2.0)
        if r is not None and r == 0:
            return True
    if x is not None and d.has(sp.Abs):
        return abs_split_zero(d, x)
    return False


def abs_split_zero(d, x):
    """Exact zero test for expressions with |p(x)| (p polynomial): split R at the real roots of every p,
    replace |p| by +p or -p on each interval (sign fixed there), and require each piece to be identically 0."""
    args = list(d.atoms(sp.Abs))
    roots = set()
    for a in args:
        p = a.args[0]
        if not p.is_polynomial(x):
            return False
        rs = limited(lambda: sp.real_roots(sp.Poly(p, x)), 2.0)
        if rs is None:
            return False
        roots |= set(rs)
    pts = sorted(roots, key=lambda r: float(r))
    edges = [-sp.oo] + pts + [sp.oo]
    for lo, hi in zip(edges, edges[1:]):
        mid = (lo + hi) / 2 if lo.is_finite and hi.is_finite else (hi - 1 if lo == -sp.oo and hi.is_finite else (lo + 1 if lo.is_finite else 0))
        rep = {}
        for a in args:
            s = certain_sign(a.args[0].subs(x, mid))
            if s not in (1, -1):
                return False
            rep[a] = a.args[0] if s == 1 else -a.args[0]
        piece = d.xreplace(rep)
        if lo.is_finite is not True and hi.is_finite is True and hi <= 0 or (lo == -sp.oo and hi == 0):
            piece = piece.xreplace({x: sp.Symbol(x.name, negative=True)})
        elif lo.is_finite and lo >= 0:
            piece = piece.xreplace({x: sp.Symbol(x.name, positive=True)})
        if not zero_test(piece, None):
            return False
    return True


CANDIDATES = [sp.Rational(n, dd) for dd in (1, 2, 3) for n in range(-7, 8)] + [sp.Integer(10), sp.Integer(-10), sp.Rational(7, 5)]


def expression_relation(e1, c1, e2, c2, x, D) -> TransitionResult:
    """Relation between expression e1 (domain conds c1) and e2 (c2) over D for single variable x."""
    d = e1 - e2
    D1, D2 = cond_set(c1, x, D), cond_set(c2, x, D)
    # assumptions restricting the sign of x (from D) are passed to SymPy as symbol assumptions -- never invented
    sx = None
    if limited(lambda: D.is_subset(sp.Interval.open(0, sp.oo)), 1.0):
        sx = sp.Symbol(x.name, positive=True)
    elif limited(lambda: D.is_subset(sp.Interval.open(-sp.oo, 0)), 1.0):
        sx = sp.Symbol(x.name, negative=True)
    elif limited(lambda: D.is_subset(sp.Interval(0, sp.oo)), 1.0):
        sx = sp.Symbol(x.name, nonnegative=True)
    elif limited(lambda: D.is_subset(sp.Interval(-sp.oo, 0)), 1.0):
        sx = sp.Symbol(x.name, nonpositive=True)
    same = zero_test(d, x) or (sx is not None and zero_test(d.xreplace({x: sx}), None))
    if same:
        if D1 is None or D2 is None:
            return TransitionResult("unresolved", "expression", "identical generically, but a natural domain could not be computed")
        lost = diff_set(D1, D2)
        gained = diff_set(D2, D1)
        le, ge = is_empty(lost), is_empty(gained)
        if le and ge:
            return TransitionResult("equivalent", "expression", "exact identity on the same domain", evidence=["zero-test", f"domain {D1}"])
        if le and ge is False:
            return TransitionResult("implication", "expression", "equal wherever the previous expression is defined; the new one is defined more widely",
                                    required_restrictions=[f"x in {D1}"], extraneous=str(gained), evidence=["zero-test", f"previous domain {D1}", f"next domain {D2}"])
        if le is False:
            pt = pick_point(lost)
            if pt is not None and conds_hold(c1, {x: pt}) is True and conds_hold(c2, {x: pt}) is False:
                return TransitionResult("invalid", "expression", "the new expression is undefined where the previous one is defined",
                                        counterexample={str(x): str(pt)}, lost=str(lost))
        return TransitionResult("unresolved", "expression", "identical generically, domain relation undecided")
    # SOUNDNESS: not proven equal -> look for an exact counterexample: first a point where the previous expression is
    # defined and the next is not, then a point of both domains where the values differ
    if D1 is not None and D2 is not None:
        lost = diff_set(D1, D2)
        if is_empty(lost) is False:
            pt = pick_point(lost)
            if pt is not None and conds_hold(c1, {x: pt}) is True and conds_hold(c2, {x: pt}) is False:
                return TransitionResult("invalid", "expression", "the new expression is undefined where the previous one is defined",
                                        counterexample={str(x): str(pt)}, lost=str(lost))
    ce = find_value_counterexample(d, c1 + c2, x, D)
    if ce is not None:
        return TransitionResult("invalid", "expression", "values differ at an exact point of both domains", counterexample={str(x): str(ce)})
    return TransitionResult("unresolved", "expression", "neither an exact identity nor an exact counterexample was found")


def find_value_counterexample(d, conds, x, D):
    for c in CANDIDATES:
        if limited(lambda: D.contains(c), 0.5) is not sp.true:
            continue
        if conds_hold(conds, {x: c}) is not True:
            continue
        v = value_at(d, {x: c})
        if v is None:
            continue
        s = certain_sign(v)
        if s in (1, -1):
            return c
    return None


def _norm_conds(cs):
    """Normalise domain conditions: a product is nonzero iff every irreducible factor is nonzero."""
    out = set()
    for k, e in cs:
        if k == "ne0":
            fl = sp.factor_list(sp.factor(e))[1] if e.free_symbols else []
            for f, _m in fl:
                out.add(("ne0", sp.factor(f)))
            if not e.free_symbols and e == 0:
                out.add(("ne0", e))
        else:
            out.add((k, sp.factor(e)))
    return out


def multi_expression_relation(e1, c1, e2, c2, syms) -> TransitionResult:
    d = e1 - e2
    if zero_test(d):
        k1, k2 = _norm_conds(c1), _norm_conds(c2)
        if k1 == k2:
            return TransitionResult("equivalent", "expression", "exact identity, identical domain conditions", evidence=["zero-test"])
        if k2 <= k1:
            return TransitionResult("implication", "expression", "exact identity; the previous expression carries extra domain conditions",
                                    required_restrictions=[f"{k}:{e}" for k, e in sorted(k1 - k2, key=str)])
        return TransitionResult("unresolved", "expression", "identity holds generically; domains not comparable")
    pts = [{s: c for s, c in zip(syms, combo)} for combo in [(2, 3, 5, 7), (3, 5, 2, 11), (sp.Rational(1, 2), 4, 3, 2), (-2, 3, 5, 7)]]
    for pt in pts:
        pt = {s: sp.sympify(v) for s, v in pt.items()}
        if conds_hold(c1 + c2, pt) is not True:
            continue
        v = value_at(d, pt)
        if v is not None and certain_sign(v) in (1, -1):
            return TransitionResult("invalid", "expression", "values differ at an exact point", counterexample={str(k): str(v) for k, v in pt.items()})
    return TransitionResult("unresolved", "expression", "multivariate: no exact identity, no counterexample")


# ------------------------------------------------------------------ statements
def equation_ratio(st1: Statement, st2: Statement):
    """Exact proof that two single equations have the same zero set: (L2-R2) = k (L1-R1) with k a nonzero constant."""
    if not (st1.kind == st2.kind == "rel" and st1.ops == ["="] and st2.ops == ["="]):
        return False
    f1 = st1.exprs[0] - st1.exprs[1]
    f2 = st2.exprs[0] - st2.exprs[1]
    if f1 == 0:
        return False
    k = limited(lambda: sp.cancel(sp.together(f2 / f1)), 2.0)
    return k is not None and k.is_number and k.is_finite and k != 0 and not k.has(sp.I)


def statement_relation(s1: Statement, s2: Statement, x, D) -> TransitionResult:
    S1, S2 = statement_set(s1, x, D), statement_set(s2, x, D)
    if S1 is None or S2 is None:
        if equation_ratio(s1, s2):
            k1 = {(k, sp.factor(e)) for k, e in s1.conds}
            k2 = {(k, sp.factor(e)) for k, e in s2.conds}
            if k1 == k2:
                return TransitionResult("equivalent", "equation-ratio", "next equation is a nonzero constant multiple of the previous one, same domain")
        return TransitionResult("unresolved", "sets", "a solution set could not be computed exactly")
    lost, extra = diff_set(S1, S2), diff_set(S2, S1)
    le, ee = is_empty(lost), is_empty(extra)
    if le and ee:
        return TransitionResult("equivalent", "sets", "same solution set", evidence=[f"set {S1}"])
    if le and ee is False:
        return TransitionResult("implication", "sets", "every solution of the previous statement satisfies the next; the next admits more",
                                extraneous=str(extra), evidence=[f"previous {S1}", f"next {S2}"])
    if le is False:
        pt = pick_point(lost)
        if pt is not None and truth_at(s1, {x: pt}) is True and truth_at(s2, {x: pt}) is False:
            return TransitionResult("invalid", "sets", "a solution of the previous statement does not satisfy the next",
                                    counterexample={str(x): str(pt)}, lost=str(lost), extraneous=None if not ee is False else str(extra))
        return TransitionResult("unresolved", "sets", "sets differ but the witness could not be re-verified exactly", lost=str(lost))
    return TransitionResult("unresolved", "sets", "set comparison undecided")


def base_domain(assumptions: list[str], ctx: Ctx, x):
    D = R
    for a in assumptions or []:
        st = parse_statement(a, ctx)
        if st.free_symbols() - {x}:
            continue
        S = statement_set(st, x, R)
        if S is None:
            raise Unreadable(f"assumption {a!r} could not be represented")
        D = sp.Intersection(D, S)
    return D


def verify_transition(prev: str, nxt: str, variables: list[str] | None = None, assumptions: list[str] | None = None,
                      task: str = "auto") -> TransitionResult:
    """Classify the inference prev -> next.
    task: 'solve' (statements compared as solution sets), 'expression' (expressions compared as functions with domains),
          'implication' (prove next from prev; same set semantics) or 'auto' (inferred from the parsed forms)."""
    t0 = time.perf_counter()
    try:
        ctx = Ctx()
        for v in variables or []:
            ctx.sym(v)
        s1 = parse_statement(prev, ctx)
        c1 = list(s1.conds) + [c for e in s1.exprs for c in expr_conds(e)]
        s2 = parse_statement(nxt, ctx)
        c2 = list(s2.conds) + [c for e in s2.exprs for c in expr_conds(e)]
        s1.conds, s2.conds = c1, c2
        syms = sorted(s1.free_symbols() | s2.free_symbols(), key=str)
        if task == "auto":
            task = "expression" if s1.kind == "expr" and s2.kind == "expr" else "solve"
        if task == "expression":
            if s1.kind != "expr" or s2.kind != "expr" or len(s1.exprs) != 1 or len(s2.exprs) != 1:
                res = TransitionResult("unresolved", "expression", "expression task but a side is not a single expression")
            elif len(syms) <= 1:
                x = syms[0] if syms else ctx.sym("x")
                D = base_domain(assumptions, ctx, x)
                res = expression_relation(s1.exprs[0], c1, s2.exprs[0], c2, x, D)
            else:
                pos = {s: sp.Symbol(s.name, positive=True) for s in syms if any(a.replace(" ", "") in (f"{s.name}>0",) for a in (assumptions or []))}
                e1, e2 = s1.exprs[0].xreplace(pos), s2.exprs[0].xreplace(pos)
                res = multi_expression_relation(e1, c1, e2, c2, syms)
        else:
            if s1.kind == "expr" or s2.kind == "expr":
                res = TransitionResult("unresolved", "sets", "statement task but a side is a bare expression")
            elif len(syms) == 1:
                x = syms[0]
                D = base_domain(assumptions, ctx, x)
                res = statement_relation(s1, s2, x, D)
            elif not syms:
                t1, t2 = truth_at(s1, {}), truth_at(s2, {})
                res = TransitionResult("unresolved", "closed", f"closed statements: {t1} -> {t2}")
                if t1 is True and t2 is True:
                    res = TransitionResult("equivalent", "closed", "both closed statements are true")
                elif t1 is True and t2 is False:
                    res = TransitionResult("invalid", "closed", "a true statement led to a false one", counterexample={})
            else:
                res = TransitionResult("unresolved", "sets", "several variables")
                if equation_ratio(s1, s2) and {(k, sp.factor(e)) for k, e in c1} == {(k, sp.factor(e)) for k, e in c2}:
                    res = TransitionResult("equivalent", "equation-ratio", "nonzero constant multiple, same domain")
    except Ambiguous as e:
        res = TransitionResult("unresolved", "", f"ambiguous: {e}")
    except Unreadable as e:
        res = TransitionResult("unresolved", "", f"unreadable: {e}")
    res.ms = round((time.perf_counter() - t0) * 1000, 2)
    return res
