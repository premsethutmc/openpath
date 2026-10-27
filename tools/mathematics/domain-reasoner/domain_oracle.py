"""Independent oracle for domain-aware rational equations in one unknown x (SymPy). Shares no code with the planner
(which does not exist yet) and is never fed by it. It decides, from the equation TEXT alone:
  - excluded values X: real zeros of every x-containing denominator, read from the UNEVALUATED expression,
  - candidates: real roots of the polynomial obtained by multiplying (L-R) by the LCD of the written denominators,
  - rejected: candidates that lie in X,
  - the solution set over the domain R \\ X, its class, tags, and whether the equation is inside the stated scope,
  - whether a transition between two states is valid, and whether a claimed solution set is right.
Equation grammar: x, integers, + - * / ^ (integer exponents), brackets, explicit *."""
import sys, os, re
for _p in os.environ.get("VENDOR", "/home/claude/vendor/sympy:/home/claude/vendor/mpmath").split(":"): sys.path.insert(0, _p)
from sympy import (symbols, Eq, S, Rational, Poly, Add, Mul, Pow, FiniteSet, Complement, solveset, cancel, together,
                   fraction, lcm, factor_list, sympify, expand, Integer)
from sympy.parsing.sympy_parser import parse_expr, standard_transformations, convert_xor
x = symbols('x'); TR = standard_transformations + (convert_xor,)
def _p(s, evaluate): return parse_expr(s, local_dict={'x': x}, transformations=TR, evaluate=evaluate)

class OutOfOracle(Exception): pass
ORDER = ['no-variable-denominator', 'denominator-outside-boundary', 'numerator-outside-boundary', 'reduced-degree>=2']

def _den_factors(e, out):
    """Collect (base, positive exponent) for every denominator containing x in an UNEVALUATED expression."""
    if e.is_Pow and e.exp.is_negative and e.base.has(x): out.append((e.base, -e.exp))
    for a in e.args: _den_factors(a, out)

def _real_zeros(poly_expr):
    p = Poly(poly_expr, x)
    if p.degree() == 0: return set()
    s = solveset(poly_expr, x, S.Reals)
    if not isinstance(s, FiniteSet): raise OutOfOracle(f"cannot enumerate real zeros of {poly_expr}")
    z = set()
    for v in s:
        if not v.is_Rational: raise OutOfOracle(f"irrational excluded value {v}")
        z.add(Rational(v))
    return z

def excluded_values(text):
    l, r = text.split('=')
    raw = Add(_p(l, False), Mul(-1, _p(r, False), evaluate=False), evaluate=False)
    fs = []; _den_factors(raw, fs)
    X = set()
    for base, _ in fs: X |= _real_zeros(base)
    return X, fs

def _linear_split(poly_expr):
    """-> (const, [roots with multiplicity]) if the polynomial splits into linear factors over Q, else None."""
    p = Poly(poly_expr, x)
    if p.degree() == 0: return (p.as_expr(), [])
    c, fl = factor_list(p.as_expr(), x)
    roots = []
    for f, m in fl:
        fp = Poly(f, x)
        if fp.degree() != 1: return None
        a, b = fp.all_coeffs(); roots += [Rational(-b, a)] * m
    return (c, roots)

def analyse(text):
    l, r = text.split('=')
    Le, Re = _p(l, True), _p(r, True)
    f = Le - Re
    reasons = []
    try:
        X, fs = excluded_values(text)
    except OutOfOracle:   # irrational or non-real zeros: outside the factorisation boundary
        raw = Add(_p(l, False), Mul(-1, _p(r, False), evaluate=False), evaluate=False)
        fs = []; _den_factors(raw, fs); X = None; reasons.append('denominator-outside-boundary')
    res = {'text': text, 'excluded': None if X is None else sorted(X), 'hasXDenominator': bool(fs)}
    # --- scope boundary (explicit, see milestone doc) ---
    if not fs: reasons.append('no-variable-denominator')
    # raw term list from the unevaluated form, for denominators; evaluated terms for numerators
    raw_terms = Add.make_args(Add(_p(l, False), Mul(-1, _p(r, False), evaluate=False), evaluate=False))
    for t in raw_terms:
        tf = []; _den_factors(t, tf)
        n_lin = 0
        for base, m in tf:
            sp = _linear_split(base)
            if sp is None or int(m) != m: reasons.append('denominator-outside-boundary'); break
            n_lin += len(sp[1]) * int(m)
        else:
            if n_lin > 3: reasons.append('denominator-outside-boundary')
    for t in Add.make_args(expand(f) if not fs else f):
        n, d = fraction(together(t))
        try:
            pn = Poly(n, x)
        except Exception:
            reasons.append('numerator-outside-boundary'); continue
        if pn.degree() > 2 or (pn.degree() == 2 and _linear_split(n) is None): reasons.append('numerator-outside-boundary')
    # --- reduction ---
    if X is None:
        res.update({'candidates': None, 'rejected': None, 'class': 'out-of-scope', 'solution': None, 
                    'removable': None, 'domainOps': 0, 'tags': [], 'reasons': [o for o in ORDER if o in reasons], 'supported': False,
                    'reducedDegree': None})
        return _stringify(res)
    Nr, Dr = fraction(cancel(together(f)))
    pN = Poly(Nr, x) if Nr.has(x) or True else None
    res['reducedDegree'] = -1 if pN.is_zero else pN.degree()
    if res['reducedDegree'] >= 2: reasons.append('reduced-degree>=2')
    # LCD route (what a student gets by clearing denominators): numerator of (L-R)*LCD
    dens = []
    for t in raw_terms:
        tf = []; _den_factors(t, tf)
        dens.append(Mul(*[b ** m for b, m in tf]) if tf else Integer(1))
    LCD = Integer(1)
    for d in dens: LCD = lcm(LCD, d) if d != 1 else LCD
    Nu = cancel(f * LCD)
    pu = Poly(Nu, x)
    try:
        cands = set() if pu.is_zero else _real_zeros(Nu) if pu.degree() >= 1 else set()
        res['candidates'] = sorted(cands); res['rejected'] = sorted(cands & X)
    except OutOfOracle:   # irrational candidates only occur when the reduced equation is quadratic: out of scope
        res['candidates'] = None; res['rejected'] = None
        if 'reduced-degree>=2' not in reasons: raise
    # --- solution set over the original domain ---
    if pN.is_zero: cls, sol = 'identity-on-domain', None
    elif pN.degree() == 0: cls, sol = 'none', []
    elif pN.degree() == 1:
        a, b = pN.all_coeffs(); root = Rational(-b, a)
        if root in X: cls, sol = 'none', []
        else: cls, sol = 'unique', [root]
    else:
        cls = 'out-of-scope'; sol = None
    res['class'] = cls
    res['solution'] = None if sol is None else [str(v) for v in sol]
    # --- exact substitution check (SymPy's solveset on rational equations proved unreliable: it reported an empty set for a
    # true identity, so it is NOT used as an authority; the Fraction-grid check in verify_datasets.py is the second oracle) ---
    if cls == 'unique' and f.subs(x, sol[0]) != 0: raise OutOfOracle(f"root {sol[0]} does not satisfy {text}")
    # --- tags ---
    removable = [a for a in X if not (Dr.subs(x, a) == 0)]
    res['removable'] = sorted(removable)
    distinct_terms_with_xden = sum(1 for t in raw_terms if any(True for _ in [0] if _tf(t)))
    res['domainOps'] = distinct_terms_with_xden + len(X) + (1 if removable else 0)
    tags = []
    if cls == 'identity-on-domain' and X: tags.append('restricted-identity')
    if removable: tags.append('removable')
    if res['rejected']: tags.append('extraneous-candidate')
    if res['rejected'] and cls == 'none': tags.append('all-candidates-rejected')
    if res['rejected'] and cls == 'unique': tags.append('extraneous-and-valid-root')
    if len(X) >= 2: tags.append('multi-excluded')
    if cls == 'none': tags.append('no-solution')
    if res['domainOps'] >= 4: tags.append('multi-step')
    res['tags'] = tags
    res['reasons'] = [o for o in ORDER if o in reasons]
    res['supported'] = not res['reasons'] and cls != 'out-of-scope' and bool(fs)
    return _stringify(res)
def _stringify(res):
    for k in ('excluded', 'candidates', 'rejected', 'removable'):
        if res.get(k) is not None: res[k] = [str(v) for v in res[k]]
    return res
def _tf(t):
    tf = []; _den_factors(t, tf); return tf

def sol_set(text, X):
    """Solution set of the equation over the real line minus X, as ('all', X) for an identity on the domain, else a sympy Set.
    Computed from the reduced numerator (exact polynomial algebra); polynomials are solved with solveset, which is reliable there."""
    l, r = text.split('=')
    f = _p(l, True) - _p(r, True)
    Nr, _ = fraction(cancel(together(f)))
    pN = Poly(Nr, x)
    if pN.is_zero: return ('all', frozenset(X))
    if pN.degree() == 0: return S.EmptySet
    return Complement(solveset(Nr, x, S.Reals), FiniteSet(*X))

def step_check(from_state, to_state):
    """States are {'eq': text, 'excluded': [rational strings]}. Returns (valid, [reason codes])."""
    X1 = {Rational(v) for v in from_state['excluded']}; X2 = {Rational(v) for v in to_state['excluded']}
    why = []
    Xt1, _ = excluded_values(from_state['eq']); Xt2, _ = excluded_values(to_state['eq'])
    if not Xt1 <= X1: raise OutOfOracle('from-state is not well formed')
    if not Xt2 <= X2: why.append('restriction-closure-violated')   # new denominators not recorded as restrictions
    if not X1 <= X2: why.append('restriction-dropped')
    if sol_set(from_state['eq'], X1) != sol_set(to_state['eq'], X2): why.append('solution-set-changed')
    return (not why), why

def claim_check(text, claimed):
    """claimed: list of rational strings, or 'all-except-excluded'. -> (valid, truth description)."""
    a = analyse(text)
    X = set(a['excluded'])
    if a['class'] == 'identity-on-domain':
        return claimed == 'all-except-excluded', 'all-except-excluded'
    if claimed == 'all-except-excluded': return False, a['solution']
    return sorted(Rational(v) for v in claimed) == sorted(Rational(v) for v in a['solution']), a['solution']
