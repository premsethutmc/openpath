"""Independent (SymPy) adjudication of the corpus 'unsupported' lines on which the evaluator returned a definite 'invalid'. Checks that the first line the evaluator flags
really has a different real solution set from the previous line on the problem's domain (irrational roots compared exactly by SymPy)."""
import json, sys
sys.path.insert(0, '/home/claude/vendor/sympy'); sys.path.insert(0, '/home/claude/vendor/mpmath')
from sympy import symbols, Eq, solveset, S, sympify, Complement, FiniteSet, denom, together
from sympy.parsing.sympy_parser import parse_expr, standard_transformations, convert_xor, implicit_multiplication_application
x = symbols('x'); TR = standard_transformations + (convert_xor, implicit_multiplication_application)
RES = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/core/tools/mathematics/core/results/student-corpus.json'
CORPUS = sys.argv[2] if len(sys.argv) > 2 else '/home/claude/core/tools/mathematics/core/student/student.json'
OUT = sys.argv[3] if len(sys.argv) > 3 else '/home/claude/core/tools/mathematics/core/results/student-F-adjudication.json'
res = json.load(open(RES))['mismatches']
tasks = {t['id']: t for t in json.load(open(CORPUS))['tasks']}
def sol(text, excl):
    l, r = text.split('='); f = parse_expr(l, transformations=TR) - parse_expr(r, transformations=TR)
    return Complement(solveset(together(f), x, S.Reals), FiniteSet(*excl))
out = []
for m in res:
    if m['expected'][0] != 'unsupported' or m['got'][0] != 'invalid': continue
    t = tasks[m['id']]; k = m['got'][1]
    lines = [t['problem']] + [l.replace('−', '-').replace('÷', '/').replace('×', '*') for l in t['lines']]; prev, cur = lines[k - 1], lines[k]
    cur = cur.replace('−', '-').replace('÷', '/').replace('×', '*')
    ex = set()
    for txt in (t['problem'], prev, cur):
        l, r = txt.split('=')
        for side in (l, r):
            e = parse_expr(side, transformations=TR); d = denom(together(e))
            if d.has(x): ex |= set(solveset(d, x, S.Reals))
    a, b = sol(prev, ex), sol(cur, ex)
    out.append({'id': m['id'], 'prev': prev, 'cur': cur, 'prev_set': str(a), 'cur_set': str(b), 'sympy_says_different': a != b})
    print(out[-1])
json.dump(out, open(OUT, 'w'), indent=1)
print('all non-equivalent per SymPy:', all(o['sympy_says_different'] for o in out), len(out))
