"""Optional offline reference check. SymPy is NOT a browser or production dependency.
Input must be the trusted output of symbolic-samples.mts, never learner expressions.
"""
import json
import sys
import sympy as sp
x = sp.Symbol('x')
items = json.load(sys.stdin)
for item in items:
    p = item['difficulty']['parameters']
    actual = sp.sympify(item['answer']['value'].replace('^', '**'), locals={'x': x})
    if item['familyId'] == 'polynomial':
        expected = p['b'] * (x + p['c']) + p['a'] * x
    elif item['familyId'] == 'calculus':
        expected = sp.diff(p['coefficient'] * x ** p['power'], x)
    else:
        raise AssertionError('Unexpected reference family')
    assert sp.simplify(actual - expected) == 0, item['id']
print(f'SymPy {sp.__version__}: {len(items)} independent symbolic checks passed')
