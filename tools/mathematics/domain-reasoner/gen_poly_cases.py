"""Randomised cases for the D0 gate: SymPy computes the expected results; the TypeScript Poly/RatFun must agree exactly.
Seed 20261110. Usage: python3 gen_poly_cases.py poly-cases.json"""
import json, random, sys, os
for _p in os.environ.get("VENDOR", "/home/claude/vendor/sympy:/home/claude/vendor/mpmath").split(":"): sys.path.insert(0, _p)
from sympy import symbols, Poly, Rational, cancel, together, fraction, factor_list, QQ, sympify
from sympy.parsing.sympy_parser import parse_expr, standard_transformations, convert_xor
x = symbols('x'); TR = standard_transformations + (convert_xor,)
rnd = random.Random(20261110)
def fr(v): v = Rational(v); return f"{v.p}/{v.q}" if v.q != 1 else str(v.p)
def cl(p): return [fr(c) for c in reversed(Poly(p, x, domain=QQ).all_coeffs())] if Poly(p, x).degree() >= 0 and not Poly(p, x).is_zero else []
def rpoly():
    p = Poly(rnd.choice([1, 1, 2, 3, -2, Rational(1, 2)]), x, domain=QQ)
    for _ in range(rnd.randint(0, 3)):
        r = rnd.choice([Rational(rnd.randint(-6, 6)), Rational(rnd.randint(-6, 6), rnd.choice([2, 3]))])
        p = p * Poly(x - r, x, domain=QQ)
    if rnd.random() < 0.2: p = p * Poly(x**2 + rnd.randint(1, 3), x, domain=QQ)
    if rnd.random() < 0.15: p = p + Poly(rnd.randint(-3, 3), x, domain=QQ)
    return p
cases = []
for _ in range(3000):
    a, b = rpoly(), rpoly()
    c = {'kind': 'poly', 'a': cl(a.as_expr()), 'b': cl(b.as_expr()),
         'add': cl((a + b).as_expr()), 'mul': cl((a * b).as_expr()), 'gcd': cl(a.gcd(b).monic().as_expr()) if not (a.is_zero and b.is_zero) else [],
         'squarefreeA': cl(a.sqf_part().monic().as_expr()) if not a.is_zero and a.degree() > 0 else None}
    if not b.is_zero:
        q, r = a.div(b); c['divq'] = cl(q.as_expr()); c['divr'] = cl(r.as_expr())
    if not a.is_zero:
        rts = sorted(a.ground_roots().keys()) if a.degree() > 0 else []
        c['rootsA'] = [fr(r) for r in rts]
        con, fl = factor_list(a.as_expr(), x)
        if all(Poly(f, x).degree() == 1 for f, m in fl):
            ms = []
            for f, m in fl: ms += [fr(-Poly(f, x).all_coeffs()[1] / Poly(f, x).all_coeffs()[0])] * m
            c['splitA'] = {'roots': sorted(ms, key=lambda s: Rational(s))}
        else: c['splitA'] = None
    cases.append(c)
def term():
    num = ' * '.join(f"(x{rnd.choice(['+','-'])}{rnd.randint(0,6)})" for _ in range(rnd.randint(0, 2))) or str(rnd.randint(1, 5))
    den = ' * '.join(f"(x{rnd.choice(['+','-'])}{rnd.randint(1,6)})" for _ in range(rnd.randint(1, 2)))
    k = rnd.choice(['', f"{rnd.randint(1,4)}*"])
    return f"{k}({num})/({den})"
for _ in range(2000):
    txt = term()
    for _ in range(rnd.randint(0, 2)): txt += rnd.choice(['+', '-']) + rnd.choice([term(), str(rnd.randint(1, 5)), 'x'])
    e = parse_expr(txt.replace('^', '**'), local_dict={'x': x}, transformations=TR)
    n, d = fraction(cancel(together(e)))
    n, d = Poly(n, x, domain=QQ), Poly(d, x, domain=QQ)
    k = d.LC()
    cases.append({'kind': 'ratfun', 'text': txt.replace(' ', ''), 'n': cl((n * (1 / k)).as_expr()) if not n.is_zero else [], 'd': cl((d * (1 / k)).as_expr())})
json.dump(cases, open(sys.argv[1], 'w'))
import hashlib; print(len(cases), hashlib.sha256(open(sys.argv[1], 'rb').read()).hexdigest())
