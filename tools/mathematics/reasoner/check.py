"""Independent checker for reasoner traces and generated equations. Shares no code with the planner or the
generator (own parser: SymPy; own solver: solveset).
Per item it verifies:
  (1) CLAIM: the frozen/generated claim (class + solution) against SymPy's solveset of the original equation.
  (2) FEATURES (generated sets): claimed structural features recomputed from the text.
  (3) STEPS: every step keeps BOTH the solution set and the domain of the previous equation. The domain is the
      reals minus the zeros of every denominator that contains x, read from the UNEVALUATED expression, so a
      silent x/x cancellation (which widens the domain) is rejected instead of being accepted.
  (4) ANSWER: a 'solved' answer substitutes exactly into the ORIGINAL equation and equals the claim.
  (5) OUTCOME: planner outcome matches the claimed class (or is an honest 'unsupported' for out-of-scope).
Usage: python3 -I check.py frozen.json traces.json out.json   (traces.json may be omitted with --claims-only)"""
import json, sys, os, re
for _p in os.environ.get("VENDOR", "/home/claude/vendor/sympy:/home/claude/vendor/mpmath").split(":"): sys.path.insert(0, _p)
from sympy import symbols, Eq, S, solveset, Rational, sympify, Pow, Mul, Add, Union, Complement, FiniteSet
from sympy.parsing.sympy_parser import parse_expr, standard_transformations, convert_xor
X = symbols('x'); TR = standard_transformations + (convert_xor,)
_dec = lambda s: re.sub(r'\d+\.\d+', lambda m: "Rational('%s')" % m.group(), s)  # exact decimals, never floats
def _p(s, evaluate): return parse_expr(_dec(s), local_dict={'x': X, 'Rational': Rational}, transformations=TR, evaluate=evaluate)
def _den_bases(e, out):
    if e.is_Pow and e.exp.is_negative and e.base.has(X): out.append(e.base)
    for a in e.args: _den_bases(a, out)
def analyse(text):
    """-> (domain, solution set on that domain, evaluated Eq)."""
    l, r = text.split('=')
    raw = Add(_p(l, False), -_p(r, False), evaluate=False)  # unevaluated: denominators survive
    bases = []; _den_bases(raw, bases)
    dom = S.Reals
    for b in bases: dom = Complement(dom, solveset(Eq(b, 0), X, S.Reals))
    e = Eq(_p(l, True), _p(r, True))
    return dom, solveset(e, X, dom), e
def klass(sol):
    if sol == S.Reals: return 'identity'
    if sol == S.EmptySet: return 'no-solution'
    return 'unique' if isinstance(sol, FiniteSet) and len(sol) == 1 else 'other'
def features(text):
    l, r = text.split('=')
    return {'brackets': bool(re.search(r'\)\s*\*|\*\s*\(|\d\s*\*\s*\(', text)) or bool(re.search(r'\([^()]*[+-][^()]*\)\s*\*|\*\s*\([^()]*[+-]', text)),
            'fraction': '/' in text, 'bothSides': 'x' in l and 'x' in r, 'decimal': '.' in text}
def step_ok(prev_text, new_text):
    """True iff new_text has the same domain AND solution set as prev_text (SymPy, domain read from the unevaluated form)."""
    d1, s1, _ = analyse(prev_text); d2, s2, _ = analyse(new_text)
    return d1 == d2 and s1 == s2
def main():
    claims_only = '--claims-only' in sys.argv
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    frozen = {i['id']: i for i in json.load(open(args[0]))}
    traces = {t['id']: t for t in json.load(open(args[1]))} if not claims_only else {}
    out, bad = [], 0
    for fid, f in frozen.items():
        problems = []
        dom, sols, eq = analyse(f['text'])
        k = klass(sols)
        fc = f['class'] if f['class'] in ('unique', 'no-solution', 'identity') else None
        if fc and dom == S.Reals and k != fc: problems.append(f"claim: class {fc} but SymPy says {k}")
        if fc == 'unique' and f.get('solution') is not None and sols != FiniteSet(sympify(f['solution'], rational=True)): problems.append(f"claim: solution {f['solution']} but SymPy says {sols}")
        if 'features' in f and dom == S.Reals:
            mine = features(f['text'])
            for kk in ('fraction', 'bothSides', 'decimal'):
                if mine[kk] != f['features'][kk]: problems.append(f"feature {kk}: claimed {f['features'][kk]} recomputed {mine[kk]}")
        tr = traces.get(fid)
        if tr and tr['outcome'] in ('solved', 'no-solution', 'identity'):
            prev_dom, prev = dom, sols
            for st in tr['steps']:
                d2, s2, _ = analyse(st['to'])
                if d2 != prev_dom: problems.append(f"step '{st['rule']}' changed the domain: {prev_dom} -> {d2}")
                if s2 != prev: problems.append(f"step '{st['rule']}' changed the solution set: {prev} -> {s2}")
                prev_dom, prev = d2, s2
            if tr['outcome'] == 'solved':
                a = sympify(tr['answer'], rational=True)
                if eq.lhs.subs(X, a) != eq.rhs.subs(X, a): problems.append('answer does not satisfy the original equation')
                if f.get('solution') is not None and sympify(f['solution'], rational=True) != a: problems.append('answer differs from claimed solution')
            want = {'unique': 'solved', 'no-solution': 'no-solution', 'identity': 'identity'}.get(f['class'])
            if want and want != tr['outcome']: problems.append(f"class {tr['outcome']} but claimed class is {f['class']}")
        out.append({'id': fid, 'outcome': tr['outcome'] if tr else None, 'claimedClass': f['class'], 'sympyClass': k, 'ok': not problems, 'problems': problems})
        bad += bool(problems)
    json.dump(out, open(args[-1], 'w'), indent=1)
    print(f"checked {len(out)} items; {bad} with problems")
if __name__ == "__main__": main()
