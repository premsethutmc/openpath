"""SymPy re-derivation of every constructed problem: restricted values, outcome class, exact solution, extraneous flag.
Shares no code with the constructor, planner or verifier. Usage: check_constructed.py constructed.json out.json"""
import sys, os, json
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'domain-reasoner'))
import domain_oracle as O
from sympy import symbols, Rational, solveset, S, FiniteSet, simplify, cancel
x = symbols('x')
def sympy_view(text):
    l, r = text.split('=')
    X, fs = O.excluded_values(text) if True else (set(), [])
    f = cancel(O._p(l, True) - O._p(r, True))
    num, den = f.as_numer_denom()
    if num == 0: return sorted(X), 'identity-on-domain', [], []
    cands = solveset(num, x, S.Reals)
    if cands == S.EmptySet: return sorted(X), 'none', [], []
    if not isinstance(cands, FiniteSet): return sorted(X), 'other', None, None
    cl = sorted(Rational(c) for c in cands)
    good = [c for c in cl if c not in X]
    cls = 'unique' if len(good) == 1 else 'none' if not good else 'other'
    rejected = [c for c in cl if c in X]
    return sorted(X), cls, good, rejected
data = json.load(open(sys.argv[1])); bad = []; n = 0
for row in data['rows']:
    b = row.get('built')
    if not b: continue
    n += 1; text = b['text']
    try:
        X, cls, good, rejected = sympy_view(text)
    except Exception as e:
        bad.append({'text': text, 'why': f'oracle error {e}'}); continue
    if [str(v) for v in X] != b['excluded']: bad.append({'text': text, 'why': f'excluded {X} vs {b["excluded"]}'}); continue
    if cls != b['outcome']: bad.append({'text': text, 'why': f'class {cls} vs {b["outcome"]}'}); continue
    if cls == 'unique' and [str(v) for v in good] != [b['solution']]: bad.append({'text': text, 'why': f'solution {good} vs {b["solution"]}'}); continue
    spec = row['spec']
    if spec.get('extraneous') is True and not (cls == 'none' and rejected): bad.append({'text': text, 'why': 'not extraneous per SymPy'}); continue
    if spec.get('excludedCount') is not None and len(X) != spec['excludedCount']: bad.append({'text': text, 'why': 'excluded count'}); continue
res = {'checked': n, 'mismatches': len(bad), 'details': bad[:20]}
json.dump(res, open(sys.argv[2], 'w'), indent=1); print(json.dumps({k: v for k, v in res.items() if k != 'details'})); [print(d) for d in bad[:5]]
sys.exit(1 if bad else 0)
