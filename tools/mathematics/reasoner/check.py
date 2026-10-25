"""Independent checker for reasoner traces. Shares no code with the planner (own parser: SymPy).
For every trace: (1) each step's equation has the same solution set as the previous one (SymPy solveset),
(2) a 'solved' answer substitutes into the ORIGINAL equation exactly, (3) the claimed class
(solved / no-solution / identity) matches the frozen set's class, and the answer matches the frozen solution.
Usage: PYTHONPATH=/home/claude/vendor python3 check.py frozen.json traces.json out.json"""
import json, sys, os, re
for _p in os.environ.get("VENDOR", "/home/claude/vendor/sympy:/home/claude/vendor/mpmath").split(":"): sys.path.insert(0, _p)
from sympy import symbols, Eq, S, solveset, Rational, sympify
from sympy.parsing.sympy_parser import parse_expr, standard_transformations, convert_xor
X = symbols('x')
TR = standard_transformations + (convert_xor,)
def to_eq(t):
    l, r = t.split('=')
    dec = lambda s: re.sub(r'\d+\.\d+', lambda m: "Rational('%s')" % m.group(), s)  # exact decimals, never floats
    p = lambda s: parse_expr(dec(s), local_dict={'x': X, 'Rational': Rational}, transformations=TR, evaluate=True)
    return Eq(p(l), p(r))
def sols(t):
    e = to_eq(t)
    return solveset(e, X, S.Reals)
def main():
    frozen = {i['id']: i for i in json.load(open(sys.argv[1]))}
    traces = json.load(open(sys.argv[2]))
    out, bad = [], 0
    for tr in traces:
        f = frozen[tr['id']]; problems = []
        if tr['outcome'] in ('solved', 'no-solution', 'identity'):
            prev = sols(tr['text'])
            for st in tr['steps']:
                cur = sols(st['to'])
                if cur != prev: problems.append(f"step '{st['rule']}' changed the solution set: {prev} -> {cur}")
                prev = cur
            if tr['outcome'] == 'solved':
                a = sympify(tr['answer'], rational=True)
                e = to_eq(tr['text'])
                if e.lhs.subs(X, a) != e.rhs.subs(X, a): problems.append('answer does not satisfy the original equation')
                if f.get('solution') is not None and sympify(f['solution'], rational=True) != a: problems.append('answer differs from frozen solution')
            want = {'unique': 'solved', 'no-solution': 'no-solution', 'identity': 'identity'}.get(f['class'])
            if want and want != tr['outcome']: problems.append(f"class {tr['outcome']} but frozen class is {f['class']}")
        out.append({'id': tr['id'], 'outcome': tr['outcome'], 'frozenClass': f['class'], 'ok': not problems, 'problems': problems})
        bad += bool(problems)
    json.dump(out, open(sys.argv[3], 'w'), indent=1)
    print(f"checked {len(out)} traces; {bad} with problems")
main()
