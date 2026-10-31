"""Independent SymPy cross-check of the authority's per-transition evidence (equations / inequalities in one variable).
For every transition the authority CERTIFIED as an equivalence, SymPy must find equal real solution sets (in the task domain);
for every transition the authority marked INVALID with an exact lost witness, SymPy must confirm the witness solves the line
before (in the domain) and not this line. usage: python3 sympy-crosscheck.py <corpus.json> <results.json> [...]"""
import json, re, sys
from sympy import symbols, S, Interval, FiniteSet, Union, solveset, Eq, Lt, Gt, Le, Ge, Rational, simplify
from sympy import Rational as _R
from sympy.parsing.sympy_parser import parse_expr, standard_transformations, implicit_multiplication_application, convert_xor
T = standard_transformations + (implicit_multiplication_application, convert_xor)
def norm(s):
    s = s.replace('−','-').replace('–','-').replace('—','-').replace('×','*').replace('÷','/').replace('·','*').replace('[','(').replace(']',')').replace('²','^2').replace('³','^3').replace('≤','<=').replace('≥','>=')
    return re.sub(r'(\d+\.\d+)', lambda m: f'Rational("{m.group(1)}")', s)
VERB = re.compile(r'^(?:expand and simplify|simplify fully|solve(?: for [a-z])?|find [a-z]|simplify|expand|factori[sz]e|calculate|evaluate|compute|work out)\s*:?\s+', re.I)
def task_parts(st):
    s = norm(st).strip().rstrip('.')
    conds = []
    m = re.search(r'\s*(?:,|\bfor\b|\bwhere\b|\bwith\b)\s+([a-z]\s*(?:≠|!=|>=|<=|>|<).*)$', s, re.I)
    if m: conds = re.split(r',|\s+and\s+', m.group(1)); s = s[:m.start()]
    return VERB.sub('', s).strip(), [c.strip() for c in conds]
def rel(text, x):
    t = norm(text)
    if re.search(r'\bor\b', t):
        parts = [rel(p, x) for p in re.split(r'\s+or\s+', t)]
        return None if any(p is None for p in parts) else ('or', parts)
    for op in ['<=', '>=', '<', '>', '=']:
        if op in t:
            a, b = t.split(op, 1)
            if any(o in b for o in ['<', '>', '=']): return None
            try: return (op, parse_expr(a, transformations=T, local_dict={'x': x, 'Rational': Rational}), parse_expr(b, transformations=T, local_dict={'x': x, 'Rational': Rational}))
            except Exception: return None
    return None
def sol(r, x, dom):
    if r is None: return None
    if r[0] == 'or': out = S.EmptySet; [out := Union(out, sol(p, x, dom))] if False else None; return Union(*[sol(p, x, dom) for p in r[1]]).intersect(dom)
    op, a, b = r; f = {'=': Eq, '<': Lt, '>': Gt, '<=': Le, '>=': Ge}[op](a, b)
    s = solveset(f, x, domain=S.Reals)
    for e in (a, b):                                          # the line's own denominators
        den = e.as_numer_denom()[1]
        if den.has(x): s = s - solveset(Eq(den, 0), x, domain=S.Reals)
    return s.intersect(dom)
def domain_of(task, conds, x):
    d = S.Reals
    r = rel(task, x)
    if r and r[0] != 'or':
        for e in r[1:]:
            den = e.as_numer_denom()[1]
            if den.has(x): d = d - solveset(Eq(den, 0), x, domain=S.Reals)
    for c in conds:
        m = re.match(r'([a-z])\s*(≠|!=|>=|<=|>|<)\s*(-?[\d.]+)', c)
        if not m: return None
        k = Rational(m.group(3)); op = m.group(2)
        d = d - FiniteSet(k) if op in ('≠', '!=') else d.intersect(Interval.open(k, S.Infinity) if op == '>' else Interval(k, S.Infinity) if op == '>=' else Interval.open(-S.Infinity, k) if op == '<' else Interval(-S.Infinity, k))
    return d
x = symbols('x')
checked = disagree = skipped = 0; notes = []
args = sys.argv[1:]
for cp, rp in zip(args[0::2], args[1::2]):
    corp = {c['id']: c for c in json.load(open(cp))}
    for r in json.load(open(rp)):
        ev = r.get('evidence'); c = corp[r['id']]
        if not ev or ev['task']['mode'] not in ('equation', 'inequality'): continue
        task, conds = task_parts(c['statement'])
        if re.search(r'[a-wyz]', task.replace('x', '')): skipped += 1; continue
        dom = domain_of(task, conds, x)
        if dom is None: skipped += 1; continue
        prev = rel(task, x)
        for k, t in enumerate(ev['transitions']):
            cur = rel(c['lines'][k], x)
            try: P, N = sol(prev, x, dom), sol(cur, x, dom)
            except Exception: P = N = None
            if P is not None and N is not None:
                if t['status'] == 'certified-equivalence':
                    checked += 1
                    if P != N: disagree += 1; notes.append((r['id'], k, 'certified equivalence but SymPy sets differ', str(P), str(N)))
                if t['status'] == 'invalid' and t.get('counterexample') and isinstance(t['counterexample'].get('lost'), dict) and t['counterexample']['lost'].get('kind') == 'exact':
                    checked += 1; w = Rational(t['counterexample']['lost']['value'])
                    if not (w in P and w not in N): disagree += 1; notes.append((r['id'], k, 'lost witness not confirmed', str(w), str(P), str(N)))
            prev = cur
print(json.dumps({'checked': checked, 'disagreements': disagree, 'skipped_tasks': skipped}))
for n in notes[:20]: print(n)
